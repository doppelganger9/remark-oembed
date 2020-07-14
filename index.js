
const visit = require('unist-util-visit');
const axios = require('axios');

const OEMBED_PROVIDERS_URL = 'https://oembed.com/providers.json';

const fetchOembed = async (endpoint /* { url: any; params: any }*/) => {
  const response = await axios.get(endpoint.url, {
    params: {
      format: 'json',
      ...endpoint.params,
    },
  });
  return response.data;
}

const fetchOembededProviders = async (providerOptions = {}) => {
  const response = await axios.get(OEMBED_PROVIDERS_URL);
  const providers = response.data;
  Object.keys(providerOptions).forEach(key => {
    const found = providers.find(p => p.provider_name === key);
    if (found) {
      found.params = providerOptions[key];
    }
  });
  return providers;
}

const getProviderEndpointForLinkUrl = (linkUrl/*: string*/, providers/*: any*/) => {
  const transformedEndpoint/*: { url: string; params: any }*/ = {
    url: null,
    params: null,
  }

  for (const provider of providers || []) {
    for (const endpoint of provider.endpoints || []) {
      for (let schema of endpoint.schemes || []) {
        schema = schema.replace('*', '.*');
        const regExp = new RegExp(schema);
        if (regExp.test(linkUrl)) {
          transformedEndpoint.url = endpoint.url;
          transformedEndpoint.params = {
            url: linkUrl,
            ...provider.params,
          };
        }
      }
    }
  }

  return transformedEndpoint;
}

const selectPossibleOembedLinkNodes = (
  markdownAST,
  usePrefix = false,
  replaceParent = true
) => {
  const nodes = [];
  visit(markdownAST, "paragraph", node => {
    if (node.children && node.children.length == 1) {
      const childNode = node.children[0];
      if (usePrefix) {
        if (childNode.type === 'inlineCode' && childNode.value.startsWith('oembed:')) {
          const mutatedNode = replaceParent ? node : childNode;
          // removing the prefix from URL from child into parent node:
          mutatedNode.url = childNode.value.substring(7).trim();
          // we'll replace parent paragraph node with oembed node
          // as there is no need to have a <p> tag with other block elements inside = invalid HTML
          // see: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p
          nodes.push(mutatedNode);
        }
      } else {
        if (childNode.type === 'link') {
          const mutatedNode = replaceParent ? node : childNode;
          mutatedNode.url = childNode.url;
          nodes.push(mutatedNode);
        }
      }
    }
  });
  return nodes;
}

const transformLinkNodeToOembedNode = (node, oembedResult) => {
  if (oembedResult.html) {
    node.type = 'html';
    node.value = oembedResult.html;
    delete node.children;
  } else if (oembedResult.type === 'photo') {
    node.type = 'html';
    node.value = `
      <img src="${oembedResult.url}"
        class="gatsby-remark-oembed-photo"
        width="${oembedResult.width}"
        height="${oembedResult.width}"
        title="${oembedResult.title}"/>
    `;
    delete node.children;
  }

  return node;
}

const processNode = async (node, providers = []) => {
  let mutatedNode = node;
  try {
    const endpoint = getProviderEndpointForLinkUrl(node.url, providers);
    if (endpoint.url) {
      const oembedResponse = await fetchOembed(endpoint);
      mutatedNode = transformLinkNodeToOembedNode(node, oembedResponse);
    }
  } catch (error) {
    error.url = node.url;
    throw error;
  }
  return mutatedNode;
}

function attacher(options) {
  options = options || {};
  const usePrefix = !!options.usePrefix;
  const replaceParent = !!options.replaceParent;

  const transformer = async (tree, _file) => {
    const providers = await fetchOembededProviders(options);
    const nodes = selectPossibleOembedLinkNodes(tree, usePrefix, replaceParent);
    await Promise.all(nodes.map(node => processNode(node, providers)));
    return tree;
  }  

  return transformer;
}

module.exports = attacher;
