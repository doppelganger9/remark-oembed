const test = require("tape");
const remark = require('remark');
const remarkMarkdown = require('remark-parse');
const remark2rehype = require('remark-rehype');
const moxios = require('moxios');
const hast_to_html = require('@starptech/prettyhtml-hast-to-html');
const oembed = require('..');
const fs = require('fs');

// TODO mock axios ?
function prepareMoxios() {``
  moxios.install();
  moxios.stubRequest('https://oembed.com/providers.json', {
    status: 200,
    responseText: fs.readFileSync('./test/mock-providers.json', { encoding: 'utf-8'}),
  });
  moxios.stubRequest(/https:\/\/www\.youtube\.com\/oembed.*/, {
    status: 200,
    responseText: fs.readFileSync('./test/mock-youtube-oembed.json', { encoding: 'utf-8'}),
  });
  moxios.stubRequest(/https:\/\/publish.twitter.com\/oembed.*/, {
    status: 200,
    responseText: fs.readFileSync('./test/mock-twitter-oembed.json', { encoding: 'utf-8'}),
  });
  moxios.stubRequest(/https:\/\/giphy.com\/services\/oembed.*/, {
    status: 200,
    responseText: fs.readFileSync('./test/mock-giphy-oembed.json', { encoding: 'utf-8'}),
  });
  moxios.stubRequest(/.*/, {
    status: 404,
  });
}


function stringify(options = {}) {
	this.Compiler = compiler;

	function compiler(tree) {
		return hast_to_html(tree, options);
	}
}

test('oembed YouTube', async (t) => {
  t.plan(1);
  prepareMoxios();

  const markdown = `
Hey this is a nice youtube video about making modern react apps with gatsby:

https://www.youtube.com/watch?v=GN0xHSk2P8Q

Check it out 👆
`;

  const markdownWithEmbed = `Hey this is a nice youtube video about making modern react apps with gatsby:

<iframe width="480" height="270" src="https://www.youtube.com/embed/GN0xHSk2P8Q?feature=oembed" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>

Check it out 👆
`;

  await new Promise(resolve => {
    remark()
      .use(oembed)
      .process(markdown, function(err, file) {
        if (err) {
          throw err;
        }
        resolve(t.equal(String(file), markdownWithEmbed));
      });
  });

  moxios.uninstall();
});

test('oembed Twitter', async (t) => {
  t.plan(1);
  prepareMoxios();

  const markdown = `Twitter embed:

https://twitter.com/stefanprodan/status/1089848015626686465

Check it out 👆
`;

  const markdownWithEmbed = `Twitter embed:

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Oh once you enable <a href="https://twitter.com/github?ref_src=twsrc%5Etfw">@GitHub</a> Actions on a repo no other integration will work. For example trying to push a git tag using a deploy key will error out with: &quot;refusing to allow an integration to create .github/main.workflow&quot;</p>&mdash; Stefan Prodan (@stefanprodan) <a href="https://twitter.com/stefanprodan/status/1089848015626686465?ref_src=twsrc%5Etfw">January 28, 2019</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>


Check it out 👆
`;

  await new Promise(resolve => {
    remark()
      .use(oembed)
      .process(markdown, function(err, file) {
        if (err) {
          throw err;
        }
        resolve(t.equal(String(file), markdownWithEmbed));
      });
  });
  moxios.uninstall();
});

test('oembed GIPHY', async (t) => {
  t.plan(1);
  prepareMoxios();

  const markdown = `GIPHY animated GIF:

https://giphy.com/gifs/hail-hypnotoad-rou0CTAp6Z8VW

It should be converted to an iframe.
`;

  const markdownWithEmbed = `GIPHY animated GIF:


      <img src="https://media2.giphy.com/media/rou0CTAp6Z8VW/giphy.gif"
        class="gatsby-remark-oembed-photo"
        width="480"
        height="480"
        title="Hail GIF - Find & Share on GIPHY"/>
    

It should be converted to an iframe.
`;

`GIPHY animated GIF:


      <img src="https://media1.giphy.com/media/rou0CTAp6Z8VW/giphy.gif"
        class="gatsby-remark-oembed-photo"
        width="480"
        height="480"
        title="Hail GIF - Find & Share on GIPHY"/>
    

It should be converted to an iframe.
`

  await new Promise(resolve => {
    remark()
      .use(oembed)
      .process(markdown, function(err, file) {
        if (err) {
          throw err;
        }
        resolve(t.equal(String(file), markdownWithEmbed));
      });
  });
  moxios.uninstall();
});


test('oembed Twitter with lots of plugins', async (t) => {
  t.plan(1);
  prepareMoxios();

  const markdown = `Twitter embed:

https://twitter.com/stefanprodan/status/1089848015626686465

Check it out 👆
`;

  const markdownWithEmbed = `<p>Twitter embed:</p>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Oh once you enable <a href="https://twitter.com/github?ref_src=twsrc%5Etfw">@GitHub</a> Actions on a repo no other integration will work. For example trying to push a git tag using a deploy key will error out with: &quot;refusing to allow an integration to create .github/main.workflow&quot;</p>&mdash; Stefan Prodan (@stefanprodan) <a href="https://twitter.com/stefanprodan/status/1089848015626686465?ref_src=twsrc%5Etfw">January 28, 2019</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<p>Check it out 👆</p>`;

  await new Promise(resolve => {
    remark()
      .use(remarkMarkdown)
      .use(oembed, {usePrefix: false, replaceParent: true})
      .use(remark2rehype, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      .use(stringify, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      .process(markdown, function(err, file) {
        if (err) {
          throw err;
        }
        resolve(t.equal(String(file), markdownWithEmbed));
      });
  });
  moxios.uninstall();
});

test('oembed Twitter with lots of plugins and inline code prefix', async (t) => {
  t.plan(1);
  prepareMoxios();

  const markdown = `Twitter embed:

\`oembed: https://twitter.com/stefanprodan/status/1089848015626686465\`

Check it out 👆
`;

  const markdownWithEmbed = `<p>Twitter embed:</p>
<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Oh once you enable <a href="https://twitter.com/github?ref_src=twsrc%5Etfw">@GitHub</a> Actions on a repo no other integration will work. For example trying to push a git tag using a deploy key will error out with: &quot;refusing to allow an integration to create .github/main.workflow&quot;</p>&mdash; Stefan Prodan (@stefanprodan) <a href="https://twitter.com/stefanprodan/status/1089848015626686465?ref_src=twsrc%5Etfw">January 28, 2019</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

<p>Check it out 👆</p>`;

  await new Promise(resolve => {
    remark()
      .use(remarkMarkdown)
      .use(oembed, {usePrefix: true, replaceParent: true})
      .use(remark2rehype, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      .use(stringify, {
        allowDangerousHtml: true,
        allowDangerousCharacters: true,
      })
      .process(markdown, function(err, file) {
        if (err) {
          throw err;
        }
        resolve(t.equal(String(file), markdownWithEmbed));
      });
  });
  moxios.uninstall();
});