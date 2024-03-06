import { DB } from "db";
import {
  createEmptyCard,
  formatDate,
  fsrs,
  generatorParameters,
  Rating,
  Grades,
  State,
  Grade,
  default_request_retention,
} from "ts-fsrs";

function dbg<T>(t: T): T {
  console.log("DEBUG", JSON.stringify(t, null, 2));
  return t;
}

export interface Deck {
  id: number;
  name: string;
}

export interface DeckWithCount extends Deck {
  count: number;
}

export interface Card {
  id: number;
  deckId: number;
  desc: string;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
  createdAt: Date;
}

export interface Revlog {
  id: number;
  cardId: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  state: number;
  review: Date;
  rating: number;
}

export interface FullCard extends Card {
  reviseDecks: Deck;
  reviseRevlog: Revlog[];
}

export interface IReviseUsecase {
  // Create a deck
  addDeck(name: string): Promise<Deck>;

  // list all the decks
  listDecks(): Promise<Deck[]>;

  // Add a new card
  addCard(deckId: number, desc: string): Promise<Card>;

  // list all thec cards of a deck
  listCards(deckId: number): Promise<Card[]>;

  // edit a card
  editCard(cardId: number, data: Partial<Card>): Promise<Card>;

  // Get all info about a single card
  getCard(cardId: number): Promise<FullCard>;

  // Delete a card
  removeCard(cardId: number): Promise<void>;

  // review a card
  reviewCard(cardId: number, value: Grade);
}

export class ReviseUsecase implements IReviseUsecase {
  db: DB;

  constructor(prisma: DB) {
    this.db = prisma;
  }

  async addDeck(name: string): Promise<Deck> {
    const deck = await this.db.reviseDecks.create({
      data: { name },
    });

    return deck;
  }

  async listDecks(): Promise<DeckWithCount[]> {
    const results = await this.db.$queryRaw<DeckWithCount[]>`
    select d.*, count(c.id) count 
    from reviseDecks d 
    left join reviseCards c
    on d.id = c.deckId 
    group by d.id order by count desc
  `;
    return results.map((r) => ({
      ...r,
      count: parseInt(r.count as unknown as string),
    }));
  }

  listCards(deckId: number): Promise<Card[]> {
    dbg(deckId);
    return dbg(
      this.db.reviseCards.findMany({
        where: { deckId },
        orderBy: { due: "asc" },
      })
    );
  }

  async addCard(deckId: number, desc: string): Promise<Card> {
    const card = await this.db.reviseCards.create({
      data: {
        deckId,
        desc,
        due: new Date(),
        stability: 0,
        difficulty: 0,
        elapsedDays: 0,
        scheduledDays: 0,
        reps: 0,
        lapses: 0,
        state: 0,
      },
    });
    return card;
  }

  async editCard(cardId: number, data: Partial<Card>): Promise<Card> {
    return this.updateCard(cardId, data);
  }

  async updateCard(id: number, data: Partial<Card>): Promise<Card> {
    return this.db.reviseCards.update({
      where: { id },
      data,
    });
  }

  async getCard(id: number): Promise<FullCard> {
    return this.db.reviseCards.findUnique({
      where: { id },
      include: { reviseDecks: true, reviseRevlog: true },
    });
  }

  async reviewCard(cardId: number, grade: Grade) {
    const crd = await this.getCard(cardId);
    const lastReview = await this.getLastReview(cardId);

    const requestRetention = default_request_retention;
    const params = generatorParameters({
      enable_fuzz: true,
      request_retention: requestRetention,
    });

    const card = createEmptyCard();

    if (lastReview) {
      card.due = crd.due;
      card.stability = crd.stability;
      card.difficulty = crd.difficulty;
      card.elapsed_days = crd.elapsedDays;
      card.scheduled_days = crd.scheduledDays;
      card.reps = crd.reps;
      card.lapses = crd.lapses;
      card.state = crd.state;
      card.last_review = crd.lastReview;
    }

    const f = fsrs(params);
    let schedulingCards = f.repeat(card, new Date());

    const next = schedulingCards[grade];
    await this.updateCard(cardId, {
      due: next.card.due,
      stability: next.card.stability,
      difficulty: next.card.difficulty,
      elapsedDays: next.card.elapsed_days,
      scheduledDays: next.card.scheduled_days,
      reps: next.card.reps,
      lapses: next.card.lapses,
      state: next.card.state,
      lastReview: next.card.last_review,
    });
    await this.addReview({
      cardId,
      due: next.log.due,
      stability: next.log.stability,
      difficulty: next.log.difficulty,
      elapsedDays: next.log.elapsed_days,
      lastElapsedDays: next.log.last_elapsed_days,
      scheduledDays: next.log.scheduled_days,
      review: next.log.review,
      rating: next.log.rating,
      state: next.log.state,
    });
  }

  async removeCard(id: number) {
    await this.db.reviseRevlog.deleteMany({
      where: { cardId: id },
    });
    await this.db.reviseCards.delete({
      where: { id },
    });
  }

  async getLastReview(id: number): Promise<Revlog | null> {
    return this.db.reviseRevlog.findFirst({
      where: { cardId: id },
      orderBy: { review: "desc" },
    });
  }

  async addReview(review: Omit<Revlog, "id">) {
    return this.db.reviseRevlog.create({
      data: review,
    });
  }
}
