export const TEST_SCHEMA = [
  {
    className: "Post",
    fields: {
      title: {
        type: "String",
      },
      content: {
        type: "String",
      },
      author: {
        type: "Pointer",
        targetClass: "_User",
      },
      tags: {
        type: "Array",
      },
      publishDate: {
        type: "Date",
      },
      editors: {
        type: "Relation",
        targetClass: "_User",
      },
    },
    classLevelPermissions: {},
  },
  {
    className: "Comment",
    fields: {
      text: {
        type: "String",
        required: true,
      },
      post: {
        type: "Pointer",
        targetClass: "Post",
        required: true,
      },
      author: {
        type: "Pointer",
        targetClass: "_User",
      },
      details: {
        type: "Object",
      },
    },
    classLevelPermissions: {},
  },
  {
    className: "_User",
    fields: {
      username: {
        type: "String",
      },
      email: {
        type: "String",
      },
      emailVerified: {
        type: "Boolean",
      },
      age: {
        type: "Number",
      },
    },
    classLevelPermissions: {},
  },
  {
    className: "_Session",
    fields: {},
    classLevelPermissions: {},
  },
];
