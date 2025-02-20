import Parser from 'rss-parser';

export interface Rss {
    /**
     * fetch all the data from given rss url
     * @param url RSS url to fetch 
     */
    parseRss(url: string): Promise<Parser.Output<Parser.Item>>;
}

export class RssParser implements Rss {
    parser: Parser;

    constructor() {
        this.parser = new Parser();
    }

    async parseRss(url: string): Promise<Parser.Output<Parser.Item>> {
        const resp = await this.parser.parseURL(url);
        return resp;
    }
}