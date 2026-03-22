export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  category: string;
  tags: string[];
  featured: boolean;
}
