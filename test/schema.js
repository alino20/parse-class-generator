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
    },
    classLevelPermissions: {},
  },
  {
    className: "Comment",
    fields: {
      content: {
        type: "String",
      },
      post: {
        type: "Pointer",
        targetClass: "Post",
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
];
