let ioInstance = null;

// Track active viewers per blog room
const activeViewers = new Map();

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Real-time client connected: ${socket.id}`);

    // Join a specific blog room for real-time live interaction
    socket.on('join-blog', ({ blogId, user }) => {
      const room = `blog_${blogId}`;
      socket.join(room);

      // Increment viewer count for this room
      const currentCount = (activeViewers.get(blogId) || 0) + 1;
      activeViewers.set(blogId, currentCount);

      console.log(`[Socket.io] User (${user?.name || 'Guest'}) joined ${room}. Live readers: ${currentCount}`);

      // Broadcast updated live viewer count to everyone in the room
      io.to(room).emit('live-viewers-updated', {
        blogId,
        liveViewers: currentCount,
        message: `${user?.name || 'A reader'} is reading this post right now`,
      });
    });

    // Leave blog room
    socket.on('leave-blog', ({ blogId }) => {
      const room = `blog_${blogId}`;
      socket.leave(room);

      const currentCount = Math.max(0, (activeViewers.get(blogId) || 1) - 1);
      activeViewers.set(blogId, currentCount);

      io.to(room).emit('live-viewers-updated', {
        blogId,
        liveViewers: currentCount,
      });
    });

    // Client sends a live typing indicator in comments
    socket.on('comment-typing', ({ blogId, userName, isTyping }) => {
      socket.to(`blog_${blogId}`).emit('user-typing', {
        userName,
        isTyping,
      });
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });
};

// Helper methods to emit real-time events from REST controllers
const notifyNewBlog = (blog) => {
  if (ioInstance) {
    ioInstance.emit('new-blog-published', {
      message: `New Blog Published: "${blog.title}" by ${blog.authorName || 'Author'}`,
      blog: {
        id: blog._id || blog.id,
        title: blog.title,
        category: blog.category,
        authorName: blog.authorName,
        createdAt: blog.createdAt,
      },
    });
  }
};

const notifyNewComment = (blogId, comment) => {
  if (ioInstance) {
    ioInstance.to(`blog_${blogId}`).emit('new-comment-received', {
      blogId,
      comment,
    });
  }
};

const notifyBlogLiked = (blogId, likeCount, user) => {
  if (ioInstance) {
    ioInstance.to(`blog_${blogId}`).emit('blog-like-updated', {
      blogId,
      likesCount: likeCount,
      likedBy: user?.name || 'A user',
    });
  }
};

module.exports = {
  initSocket,
  notifyNewBlog,
  notifyNewComment,
  notifyBlogLiked,
  getIo: () => ioInstance,
};
