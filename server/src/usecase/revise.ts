import { DB } from "db";
import {createEmptyCard, formatDate, fsrs, generatorParameters, Rating, Grades, State, Grade} from 'ts-fsrs';

function dbg<T>(t: T) : T {
  console.log("DEBUG", JSON.stringify(t, null, 2));
  return t;
}

export interface Deck {
  id: number;
  name: string;
}

export interface Card {
  id: number;
  desc: string;
  deckId: number;
}

export interface Revlog {
  id: number;
  cardId: number;
  lastInterval: number;
  interval: number;
  reviewTime: string;
  stability: number;
  difficulty: number;
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
  editCard(cardId: number, data: Partial<Card>) : Promise<Card>;

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

  async listDecks(): Promise<Deck[]> {
    const results = await this.db.reviseDecks.findMany();
    return results;
  }

  listCards(deckId: number): Promise<Card[]> {
    dbg(deckId)
    return dbg(this.db.reviseCards.findMany({
      where: { deckId },
      orderBy: { nextShowDate: "asc"}
    }))
  }


  async addCard(deckId: number, desc: string): Promise<Card> {
    const card = await this.db.reviseCards.create({
      data: {
        deckId,
        desc,
        nextShowDate: new Date(),
      },
    });
    return card;
  }

 async editCard(cardId: number, data: Partial<Card>) : Promise<Card> {
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

  async reviewCard(cardId: number, grade: Grade){

    const lastReview = await this.getLastReview(cardId);
    const params = generatorParameters({ enable_fuzz: true });
    // params.request_retention = .


    const daysElapsed = lastReview ? Math.floor((new Date().getTime() - new Date(lastReview.reviewTime).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const card = createEmptyCard()
    if (lastReview) {
      card.difficulty = lastReview.difficulty;
      card.stability = lastReview.stability
      card.elapsed_days = daysElapsed;
      card.state = State.Review;
    }
    const f = fsrs(params);
    let schedulingCards = f.repeat(card, new Date());
    console.log(JSON.stringify(schedulingCards[grade], null, 2));
  }


  async removeCard(id: number) {
    this.db.reviseCards.delete({
      where: { id },
    });
  }

  async getLastReview(id: number): Promise<Revlog | null> {
    return this.db.reviseRevlog.findFirst({
      where: { cardId: id },
      orderBy: { reviewTime: "desc" },
    });
  }

  async addReview(review: Omit<Revlog, "id">) {
    return this.db.reviseRevlog.create({
      data: review,
    });
  }
}
