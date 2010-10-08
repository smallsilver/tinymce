/**
 * DomParser.js
 *
 * Copyright 2010, Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */

(function(tinymce) {
	tinymce.html.DomParser = function(settings, schema) {
		var self = this, nodeFilters = {}, attributeFilters = [];

		settings = settings || {};

		self.addNodeFilter = function(name, callback) {
			tinymce.each(tinymce.explode(name), function(name) {
				var list = nodeFilters[name];

				if (!list)
					nodeFilters[name] = list = [];

				list.push(callback);
			});
		};

		self.addAttributeFilter = function(name, callback) {
			tinymce.each(tinymce.explode(name), function(name) {
				var i;

				for (i = 0; i < attributeFilters.length; i++) {
					if (attributeFilters[i].name === name) {
						attributeFilters[i].callbacks.push(callback);
						return;
					}
				}

				attributeFilters.push({name: name, callbacks: [callback]});
			});
		};

		self.parse = function(html) {
			var parser, rootNode, node, Node = tinymce.html.Node, matchedNodes = {}, matchedAttributes = {},
				i, l, fi, fl, list, name, blockElements, startWhiteSpaceRegExp,
				endWhiteSpaceRegExp, allWhiteSpaceRegExp, whiteSpaceElements, lastEndWasBlock;

			blockElements = tinymce.extend({
				script: 1,
				style: 1
			}, schema.getBlockElements());

			whiteSpaceElements = schema.getWhiteSpaceElements();
			startWhiteSpaceRegExp = /^[\s\r\n]+/;
			endWhiteSpaceRegExp = /[\s\r\n]+$/;
			allWhiteSpaceRegExp = /[\s\r\n]+/g;

			function createNode(name, type) {
				var node = new Node(name, type), list;

				if (name in nodeFilters) {
					list = matchedNodes[name];

					if (list)
						list.push(node);
					else
						matchedNodes[name] = [node];
				}

				return node;
			}

			parser = new tinymce.html.SaxParser(tinymce.extend({
				cdata: function(text) {
					node.append(createNode('#cdata', 4)).value = text;
				},

				text: function(text) {
					// Trim all redundant whitespace on non white space elements
					if (!whiteSpaceElements[node.name]) {
						text = text.replace(allWhiteSpaceRegExp, ' ');

						if (lastEndWasBlock)
							text = text.replace(endWhiteSpaceRegExp, '');
					}

					// Do we need to create the node
					if (text.length !== 0)
						node.append(createNode('#text', 3)).value = text;
				},

				comment: function(text) {
					node.append(createNode('#comment', 8)).value = text;
				},

				start: function(name, attrs, empty) {
					var newNode, attrFiltersLen, elementRule;

					elementRule = schema.getElementRule(name);
					if (elementRule) {
						newNode = createNode(elementRule.outputName || name, 1);
						newNode.attributes = attrs;
						newNode.empty = empty;

						node.append(newNode);

						attrFiltersLen = attributeFilters.length;
						while (attrFiltersLen--) {
							name = attributeFilters[attrFiltersLen].name;

							if (attrs.map[name]) {
								list = matchedAttributes[name];

								if (list)
									list.push(newNode);
								else
									matchedAttributes[name] = [newNode];
							}
						}

						if (!empty)
							node = newNode;
						else
							lastEndWasBlock = false;
					}
				},

				end: function(name) {
					var textNode, elementRule;

					elementRule = schema.getElementRule(name);
					if (elementRule) {
						if (blockElements[name]) {
							if (!whiteSpaceElements[node.name]) {
								// Trim start white space
								textNode = node.firstChild;
								if (textNode && textNode.type === 3)
									textNode.value = textNode.value.replace(startWhiteSpaceRegExp, '');

								// Trim end white space
								textNode = node.lastChild;
								if (textNode && textNode.type === 3)
									textNode.value = textNode.value.replace(endWhiteSpaceRegExp, '');
							}

							// Trim start white space
							textNode = node.prev;
							if (textNode && textNode.type === 3)
								textNode.value = textNode.value.replace(startWhiteSpaceRegExp, '');

							lastEndWasBlock = true;
						} else
							lastEndWasBlock = false;

						node = node.parent;
					}
				}
			}, settings), schema);

			rootNode = node = new Node('#frag', 11);

			parser.parse(html);

			// Run node filters
			for (name in matchedNodes) {
				list = nodeFilters[name];

				for (i = 0, l = list.length; i < l; i++) {
					list[i](matchedNodes[name], name);
				}
			}

			// Run attribute filters
			for (i = 0, l = attributeFilters.length; i < l; i++) {
				list = attributeFilters[i];

				if (list.name in matchedAttributes) {
					for (fi = 0, fl = list.callbacks.length; fi < fl; fi++) {
						list.callbacks[fi](matchedAttributes[list.name], list.name);
					}
				}
			}

			return rootNode;
		};
	}
})(tinymce);
