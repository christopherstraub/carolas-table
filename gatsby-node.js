const path = require('path');
const {
  getLocales,
  getLocalizedPath,
  getLocalizedPathFromSlug,
} = require('./src/i18n');

const locales = getLocales();

exports.onCreatePage = async ({ page, actions }) => {
  const { createPage, deletePage } = actions;

  const localized404PathRegex = /^\/[a-z]{2}\/404\/$/;
  if (page.path.match(localized404PathRegex)) {
    const locale = page.path.split('/')[1];

    deletePage(page);
    createPage({
      ...page,
      matchPath: `/${locale}/*`,
      context: { onNotFoundPage: true },
    });
  } else if (page.path.endsWith('/404/')) {
    deletePage(page);
    createPage({ ...page, context: { onNotFoundPage: true } });
  }
};

exports.createPages = async ({ actions, graphql }) => {
  const { createRedirect, createPage } = actions;
  createRedirect({
    fromPath: 'https://carolastable.netlify.app/*',
    isPermanent: false,
    toPath: 'https://www.carolastable.com/:splat',
    force: true,
  });

  /**
   * @param {Object.<string, string>} localePaths Object with locale keys and
   * unprefixed path values.
   * @param {string} template
   */
  function createLocalizedPagesFromPaths(localePaths, template) {
    locales.forEach((locale) => {
      const alternateLocale = locales.find((l) => l !== locale);
      createPage({
        path: getLocalizedPath(localePaths[locale], locale),
        component: template,
        context: {
          locale,
          alternateLocalePath: getLocalizedPath(
            localePaths[alternateLocale],
            alternateLocale
          ),
        },
      });
    });
  }

  const indexPagePaths = Object.fromEntries(
    locales.map((locale) => [locale, '/'])
  );
  const indexTemplate = path.resolve('src/templates/index.js');
  createLocalizedPagesFromPaths(indexPagePaths, indexTemplate);

  const {
    data: { translations },
  } = await graphql(`
    query SearchSlugs {
      translations: allContentfulTranslations(
        filter: { for: { eq: "Application" } }
      ) {
        nodes {
          node_locale
          translations {
            search {
              slug
            }
          }
        }
      }
    }
  `);
  const searchPagePaths = Object.fromEntries(
    locales.map((locale) => [
      locale,
      `/${
        translations.nodes.find((node) => node.node_locale === locale)
          .translations.search.slug
      }/`,
    ])
  );
  const searchTemplate = path.resolve('src/templates/search.js');
  createLocalizedPagesFromPaths(searchPagePaths, searchTemplate);

  /**
   * @param {Object[]} nodes
   * @param {string} nodes[].slug
   * @param {string} nodes[].node_locale
   * @param {string} nodes[].id
   * @param {string} nodes[].contentful_id
   * @param {string} template
   */
  function createLocalizedPagesFromNodes(nodes, template) {
    nodes.forEach((node) => {
      const {
        slug,
        node_locale: locale,
        id,
        contentful_id: contentfulId,
      } = node;
      const { node_locale: alternateLocale, slug: alternateLocaleSlug } =
        nodes.find(
          (n) => n.node_locale !== locale && n.contentful_id === contentfulId
        );

      createPage({
        path: getLocalizedPathFromSlug(slug, locale),
        component: template,
        context: {
          id,
          alternateLocalePath: getLocalizedPathFromSlug(
            alternateLocaleSlug,
            alternateLocale
          ),
        },
      });
    });
  }

  const {
    data: { recipes },
  } = await graphql(`
    query Recipes {
      recipes: allContentfulRecipe {
        nodes {
          slug
          node_locale
          id
          contentful_id
        }
      }
    }
  `);
  const recipeTemplate = path.resolve('src/templates/recipe.js');
  createLocalizedPagesFromNodes(recipes.nodes, recipeTemplate);

  const {
    data: { pages },
  } = await graphql(`
    query Pages {
      pages: allContentfulPage {
        nodes {
          slug
          node_locale
          id
          contentful_id
        }
      }
    }
  `);
  const pageTemplate = path.resolve('src/templates/page.js');
  createLocalizedPagesFromNodes(pages.nodes, pageTemplate);

  const {
    data: { recipeCourseTags },
  } = await graphql(`
    query RecipeCourseTags {
      recipeCourseTags: allContentfulRecipeCourseTag {
        nodes {
          slug
          node_locale
          id
          contentful_id
        }
      }
    }
  `);
  const recipeCourseTemplate = path.resolve('src/templates/recipe-course.js');
  createLocalizedPagesFromNodes(recipeCourseTags.nodes, recipeCourseTemplate);
};

/**
 * We override the ingredientTags field type (`[String]` by default) with a new
 * type IngredientTags. We provide a custom resolver to this field in the
 * createResolvers API (implemented below). Alternatively, we could have both
 * defined the type and provided the resolver in the createSchemaCustomization
 * API using Gatsby Type Builders.
 */
exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  const typeDefs = `
  type ContentfulRecipe implements Node {
    ingredientTags: [IngredientTag]
  }
  type IngredientTag {
    node_locale: String!
    title: String!
    id: String!
    type: String!
  }
  `;
  createTypes(typeDefs);
};

exports.createResolvers = ({ createResolvers }) => {
  function capitalize(string) {
    return `${string[0].toUpperCase()}${string.slice(1)}`;
  }

  const resolvers = {
    /**
     * To each `contentfulRecipeIngredientsTextNode` object type
     * (ingredients field), we'd like to add the 'scaleWhitelists'
     * corresponding to the parent (a recipe) node_locale.
     */
    contentfulRecipeIngredientsTextNode: {
      scaleWhitelists: {
        type: `[ContentfulRecipeIngredientsScaleWhitelist]`,
        resolve: async (source, args, context) => {
          const parentNodeLocale = context.nodeModel.getNodeById({
            id: source.parent,
            type: `ContentfulRecipe`,
          }).node_locale;

          const { entries } = await context.nodeModel.findAll({
            type: `ContentfulRecipeIngredientsScaleWhitelist`,
            query: {
              filter: {
                node_locale: {
                  eq: parentNodeLocale,
                },
              },
            },
          });
          return entries;
        },
      },
    },

    /**
     * Add a type field to each of the tag object types to assist in
     * differentiating between them in the application.
     */
    ContentfulRecipeCourseTag: {
      type: {
        type: `String!`,
        resolve: () => 'course',
      },
    },
    ContentfulRecipeSpecialConsiderationTag: {
      type: {
        type: `String!`,
        resolve: () => 'specialConsideration',
      },
    },
    ContentfulRecipeSeasonTag: {
      type: {
        type: `String!`,
        resolve: () => 'season',
      },
    },

    /**
     * With the previous three tag types we wanted to add a new field
     * which can be accomplished with just the createResolvers API.
     * However we want to override the ingredientTags field type which requires
     * we define the new type with the createTypes action only available in the
     * createSchemaCustomization API (implemented above).
     */
    ContentfulRecipe: {
      ingredientTags: {
        resolve: (source) =>
          source.ingredientTags?.map((tag) => ({
            node_locale: source.node_locale,
            title: capitalize(tag),
            id: tag,
            type: `ingredient`,
          })),
      },
    },

    Query: {
      allContentfulRecipeIngredientTag: {
        type: `[IngredientTag]`,
        args: { node_locale: `String` },
        resolve: async (source, args, context) => {
          const { node_locale: nodeLocale } = args;

          if (nodeLocale !== undefined) {
            const { entries } = await context.nodeModel.findAll({
              type: `ContentfulRecipe`,
              query: {
                filter: {
                  node_locale: { eq: nodeLocale },
                },
              },
            });

            const recipes = [...entries];
            const ingredientTags = recipes.flatMap(
              (recipe) => recipe.ingredientTags ?? []
            );
            const uniqueIngredientTags = [...new Set(ingredientTags)];

            return uniqueIngredientTags.map((tag) => ({
              node_locale: nodeLocale,
              title: capitalize(tag),
              id: tag,
              type: 'ingredient',
            }));
          }

          const { entries } = await context.nodeModel.findAll({
            type: `ContentfulRecipe`,
          });

          return locales.flatMap((locale) => {
            const ingredientTags = [...entries]
              .filter((recipe) => recipe.node_locale === locale)
              .flatMap((recipe) => recipe.ingredientTags ?? []);
            const uniqueIngredientTags = [...new Set(ingredientTags)];
            return uniqueIngredientTags.map((tag) => ({
              node_locale: locale,
              title: capitalize(tag),
              id: tag,
              type: 'ingredient',
            }));
          });
        },
      },
    },
  };
  createResolvers(resolvers);
};
