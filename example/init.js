import { registerAll, Post, Comment } from "../types/parse-classes";
import Parse from "parse";

registerAll();

Parse.initialize("YOUR_APPLICATION_ID", "YOUR_JAVASCRIPT_KEY");
Parse.serverURL = "XXXXXXXXXXXXXXXXXXXXXXXXXXX";

const post = await new Parse.Query(Post).first();
const author = post.get("author");
