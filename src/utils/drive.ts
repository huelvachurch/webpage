export const getOptimizedImageUrl = (url: string) => {
  if (!url) return url;
  
  let id = null;

  // Extract ID from various Google Drive URL formats
  const match = url.match(/drive\.google\.com\/file\/d\/(.*?)\//) 
    || url.match(/drive\.google\.com\/open\?id=(.*?)$/) 
    || url.match(/drive\.google\.com\/file\/d\/(.*?)$/)
    || url.match(/drive\.google\.com\/uc\?.*?id=(.*?)(?:&|$)/);
    
  if (match && match[1]) {
    id = match[1].split('&')[0];
  } else if (/^[a-zA-Z0-9_-]{25,40}$/.test(url)) {
    // If user just pasted an ID (basic length check)
    id = url;
  }
  
  if (id) {
    // lh3.googleusercontent.com is Google's public image hosting domain and avoids cookie/CORS issues
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  
  return url;
};
