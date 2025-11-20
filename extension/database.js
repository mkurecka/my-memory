// Database Manager for X Post Sender Extension
// Simple database using chrome.storage.local to track generated posts

class PostDatabase {
  constructor() {
    this.storageKey = 'xpost_database';
  }

  // Initialize database if it doesn't exist
  async init() {
    const data = await this.getAll();
    if (!data) {
      await this.save([]);
    }
  }

  // Get all posts from database
  async getAll() {
    return new Promise((resolve) => {
      chrome.storage.local.get([this.storageKey], (result) => {
        resolve(result[this.storageKey] || []);
      });
    });
  }

  // Save entire database
  async save(posts) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [this.storageKey]: posts }, () => {
        resolve(true);
      });
    });
  }

  // Add a new post to database
  async addPost(postData) {
    const posts = await this.getAll();

    const newPost = {
      id: this.generateId(),
      type: postData.type || 'generated', // 'generated', 'saved', 'memory', 'processed'
      targetAccount: postData.targetAccount || '',
      account: postData.account || '',
      postUrl: postData.postUrl,
      mode: postData.mode || '',
      language: postData.language || 'cs',
      originalText: postData.originalText,
      generatedOutput: postData.generatedOutput || '',
      author: postData.author || '',
      comment: postData.comment || '',
      context: postData.context || {},
      status: 'pending', // pending, approved, done, rejected
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    posts.unshift(newPost); // Add to beginning
    await this.save(posts);

    console.log('Post added to database:', newPost.id);
    return newPost;
  }

  // Add a saved tweet (for later use)
  async saveTweet(tweetData) {
    return await this.addPost({
      type: 'saved',
      postUrl: tweetData.postUrl,
      originalText: tweetData.text,
      author: tweetData.author,
      comment: tweetData.comment || 'Saved for later'
    });
  }

  // Get post by ID
  async getPostById(id) {
    const posts = await this.getAll();
    return posts.find(post => post.id === id);
  }

  // Update post status
  async updateStatus(id, status) {
    const posts = await this.getAll();
    const postIndex = posts.findIndex(post => post.id === id);

    if (postIndex === -1) {
      console.error('Post not found:', id);
      return false;
    }

    posts[postIndex].status = status;
    posts[postIndex].updatedAt = new Date().toISOString();

    await this.save(posts);
    console.log('Post status updated:', id, status);
    return true;
  }

  // Update post data
  async updatePost(id, updates) {
    const posts = await this.getAll();
    const postIndex = posts.findIndex(post => post.id === id);

    if (postIndex === -1) {
      console.error('Post not found:', id);
      return false;
    }

    posts[postIndex] = {
      ...posts[postIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await this.save(posts);
    console.log('Post updated:', id);
    return true;
  }

  // Delete post by ID
  async deletePost(id) {
    const posts = await this.getAll();
    const filteredPosts = posts.filter(post => post.id !== id);

    if (posts.length === filteredPosts.length) {
      console.error('Post not found:', id);
      return false;
    }

    await this.save(filteredPosts);
    console.log('Post deleted:', id);
    return true;
  }

  // Get posts by status
  async getPostsByStatus(status) {
    const posts = await this.getAll();
    return posts.filter(post => post.status === status);
  }

  // Get posts by account
  async getPostsByAccount(targetAccount) {
    const posts = await this.getAll();
    return posts.filter(post => post.targetAccount === targetAccount);
  }

  // Get recent posts (limit)
  async getRecentPosts(limit = 10) {
    const posts = await this.getAll();
    return posts.slice(0, limit);
  }

  // Generate unique ID
  generateId() {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get statistics
  async getStats() {
    const posts = await this.getAll();

    return {
      total: posts.length,
      pending: posts.filter(p => p.status === 'pending').length,
      approved: posts.filter(p => p.status === 'approved').length,
      done: posts.filter(p => p.status === 'done').length,
      rejected: posts.filter(p => p.status === 'rejected').length,
      byAccount: this.groupByAccount(posts),
      byMode: this.groupByMode(posts)
    };
  }

  // Helper: Group by account
  groupByAccount(posts) {
    return posts.reduce((acc, post) => {
      acc[post.targetAccount] = (acc[post.targetAccount] || 0) + 1;
      return acc;
    }, {});
  }

  // Helper: Group by mode
  groupByMode(posts) {
    return posts.reduce((acc, post) => {
      acc[post.mode] = (acc[post.mode] || 0) + 1;
      return acc;
    }, {});
  }

  // Export database as JSON
  async exportToJSON() {
    const posts = await this.getAll();
    return JSON.stringify(posts, null, 2);
  }

  // Import database from JSON
  async importFromJSON(jsonString) {
    try {
      const posts = JSON.parse(jsonString);
      if (!Array.isArray(posts)) {
        throw new Error('Invalid format: expected array');
      }
      await this.save(posts);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  // Clear all posts (use with caution)
  async clearAll() {
    await this.save([]);
    console.log('Database cleared');
    return true;
  }
}

// Export singleton instance
const postDatabase = new PostDatabase();
