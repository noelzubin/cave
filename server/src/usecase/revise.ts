import { DB } from "db";

export interface Deck {
  id: number;
  name: string;
}

export interface IReviseUsecase {
  // Create a deck
  addDeck(name: string): Promise<Deck>;

  // list all the decks
  listDecks(): Promise<Deck[]>;
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
}
