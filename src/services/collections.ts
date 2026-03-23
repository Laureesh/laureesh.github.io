import type {
  AdminActivityRecord,
  AdminBootstrapRecord,
  BlogPostRecord,
  FeatureToggleRecord,
  LinkRecord,
  PageContentRecord,
  PortfolioRecord,
  ProjectRecord,
  RankRecord,
  SubscriptionRecord,
  TaskRecord,
  UserProfile,
} from "../types/models";
import { collectionRef, documentRef } from "../firebase/firestore";

export const COLLECTIONS = {
  users: "users",
  adminBootstraps: "admin_bootstrap",
  blogs: "blogs",
  projects: "projects",
  links: "links",
  pages: "pages",
  portfolios: "portfolios",
  ranks: "ranks",
  tasks: "tasks",
  subscriptions: "subscriptions",
  adminActivity: "admin_activity",
  featureToggles: "feature_toggles",
} as const;

export function usersCollection() {
  return collectionRef<UserProfile>(COLLECTIONS.users);
}

export function userDocument(uid: string) {
  return documentRef<UserProfile>(COLLECTIONS.users, uid);
}

export function adminBootstrapCollection() {
  return collectionRef<AdminBootstrapRecord>(COLLECTIONS.adminBootstraps);
}

export function adminBootstrapDocument(uid: string) {
  return documentRef<AdminBootstrapRecord>(COLLECTIONS.adminBootstraps, uid);
}

export function blogsCollection() {
  return collectionRef<BlogPostRecord>(COLLECTIONS.blogs);
}

export function blogDocument(blogId: string) {
  return documentRef<BlogPostRecord>(COLLECTIONS.blogs, blogId);
}

export function projectsCollection() {
  return collectionRef<ProjectRecord>(COLLECTIONS.projects);
}

export function projectDocument(projectId: string) {
  return documentRef<ProjectRecord>(COLLECTIONS.projects, projectId);
}

export function linksCollection() {
  return collectionRef<LinkRecord>(COLLECTIONS.links);
}

export function linkDocument(linkId: string) {
  return documentRef<LinkRecord>(COLLECTIONS.links, linkId);
}

export function pagesCollection() {
  return collectionRef<PageContentRecord>(COLLECTIONS.pages);
}

export function pageDocument(pageId: string) {
  return documentRef<PageContentRecord>(COLLECTIONS.pages, pageId);
}

export function portfoliosCollection() {
  return collectionRef<PortfolioRecord>(COLLECTIONS.portfolios);
}

export function portfolioDocument(portfolioId: string) {
  return documentRef<PortfolioRecord>(COLLECTIONS.portfolios, portfolioId);
}

export function ranksCollection() {
  return collectionRef<RankRecord>(COLLECTIONS.ranks);
}

export function rankDocument(rankId: string) {
  return documentRef<RankRecord>(COLLECTIONS.ranks, rankId);
}

export function tasksCollection() {
  return collectionRef<TaskRecord>(COLLECTIONS.tasks);
}

export function taskDocument(taskId: string) {
  return documentRef<TaskRecord>(COLLECTIONS.tasks, taskId);
}

export function subscriptionsCollection() {
  return collectionRef<SubscriptionRecord>(COLLECTIONS.subscriptions);
}

export function subscriptionDocument(subscriptionId: string) {
  return documentRef<SubscriptionRecord>(COLLECTIONS.subscriptions, subscriptionId);
}

export function userSubscriptionDocument(uid: string) {
  return subscriptionDocument(uid);
}

export function adminActivityCollection() {
  return collectionRef<AdminActivityRecord>(COLLECTIONS.adminActivity);
}

export function adminActivityDocument(activityId: string) {
  return documentRef<AdminActivityRecord>(COLLECTIONS.adminActivity, activityId);
}

export function featureTogglesCollection() {
  return collectionRef<FeatureToggleRecord>(COLLECTIONS.featureToggles);
}

export function featureToggleDocument(toggleKey: string) {
  return documentRef<FeatureToggleRecord>(COLLECTIONS.featureToggles, toggleKey);
}
