'use strict';

const fs = require('fs');
const axios = require('axios');
const readline = require('readline');

const configData = JSON.parse(fs.readFileSync('config.json'));
const { key: apiKey, keywords } = configData;
const keywordsRegex = new RegExp(keywords.join("|"), 'i');

const [ blog, offsetValue ] = process.argv.slice(2);
const allPosts = [];

if (!blog) {
    console.error("No blog specified");
    return;
}

if (!keywords || keywords.length === 0) {
    console.error("No keywords specified to match on.");
    return;
}

if (!apiKey) {
    console.error("API Key not specified.");
    return;
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const postExtractor = ({post_url, source_url, question, answer, body}) => {
    const condensed = {post_url, source_url, question, answer, body};
    Object.keys(condensed).forEach((key) => (condensed[key] == null) && delete condensed[key]);

    return condensed;
};

const filterMyPost = (post) => keywordsRegex.test(JSON.stringify(post));

const commit = () => {
    const posts = allPosts.filter(filterMyPost)
    .map(postExtractor);

    fs.writeFileSync(`json/${blog}.json`, JSON.stringify(posts, null, 2));
    console.log(`Wrote json/${blog}.json, ${posts.length} found.`);

    process.exit();
};

const download = async (offset) => {
    const a = axios.create();

    process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
            commit();
        }
    });

    try {
        while (true) {
            const { data: { response: { posts } } } = await a.get(`https://api.tumblr.com/v2/blog/${blog}.tumblr.com/posts?api_key=${apiKey}&limit=50&offset=${offset}`);
            console.log(`Offset: ${offset}`);
    
            if (posts.length > 0) {
                allPosts.push(...posts);
            } else {
                break;
            }
    
            offset += 50;
        }
    } catch (err) {
        console.error(err);
    }

    commit();
};

download(offsetValue ? parseInt(offsetValue, 10) : 0);
