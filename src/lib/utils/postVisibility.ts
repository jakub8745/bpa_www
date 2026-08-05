const homeExcludedPostIds = new Set([
  "paft-grant-literature-in-the-visual-field",
  "imponderabilia",
]);

export const showPostOnHome = (post: { id: string }) =>
  !homeExcludedPostIds.has(post.id);
