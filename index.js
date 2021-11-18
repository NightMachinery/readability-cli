#!/usr/bin/env node

const sanitizeEnabled = ! Boolean(process.env.readability_sanitize_disabled)
const debug = Boolean(process.env.DEBUGME)
// const handleError = err => console.error(err.toString());

const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const jsdomConsole = new jsdom.VirtualConsole();

// Suppress these errors for now
jsdomConsole.on('jsdomError', () => { });

const createDOMPurify = require('dompurify');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const sanitizeHtml = require('sanitize-html');
const sanOpts = {
  // allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img' ])
  // allow all tags or all attributes:
  allowedTags: false,
  allowedAttributes: false
}
const program = require('commander');
const pkg = require('./package.json');
var { Readability } = require('@mozilla/readability');

const readability = (dom, url) => {
  // Happens on missing file
  if (!dom) return;
  const article = new Readability(dom.window.document).parse();

  if (!article) {
    console.error(`Error: Readability returned nothing for url "${url}". This usually happens on empty input.`);
    return;
  }

  // if (debug) {
  //   console.error(JSON.stringify(article));
  // }

  if (article.title) {
    console.log('<p><b>', sanitizeHtml(article.title), '</b></p>')
  }
  if (sanitizeEnabled) {
    console.log(sanitizeHtml(article.content, sanOpts));
  } else {
    console.log(article.content);
  }
};


const run = (url) => {
  (async () => {
    const getStdin = require('get-stdin');
    var doc = await getStdin();

    var clean = doc;
    if (sanitizeEnabled) {
      clean = DOMPurify.sanitize(clean);
    }

    if (debug) {
      console.error('url: ', url)
    }

    const options = {
      features: {
        FetchExternalResources: false,
        ProcessExternalresources: false,
      },
      virtualConsole: jsdomConsole,
      url: url,
    };

    readability(new JSDOM(clean, options), url);
  })();
};

program
  .version(pkg.version)
  .arguments('<url>')
  .description('Sanitizes stdin, parses the result with Mozilla Readability, somewhat sanitizes the output again, and finally prints it to stdout. Note that you need to also specify the URL in addition to feeding us the HTML in stdin. Using an empty URL seems to work though.')
  .action(run)
  .parse(process.argv);

