 import React, { useState, useEffect, useRef } from 'react';
import { Camera, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Search, Home, PlusSquare, User, Settings, LogOut, Upload, X } from 'lucide-react';


const Firebase = {
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: (email, password) => Promise.resolve({ user: { uid: '1', email, displayName: email.split('@')[0] } }),
    createUserWithEmailAndPassword: (email, password) => Promise.resolve({ user: { uid: '1', email, displayName: email.split('@')[0] } }),
    signOut: () => Promise.resolve(),
    onAuthStateChanged: (callback) => {
      
      setTimeout(() => callback(Firebase.auth.currentUser), 100);
    }
  },
  firestore: {
    collection: (name) => ({
      add: (data) => Promise.resolve({ id: Date.now().toString() }),
      doc: (id) => ({
        update: (data) => Promise.resolve(),
        delete: () => Promise.resolve()
      }),
      orderBy: () => ({
        onSnapshot: (callback) => {
         
          const posts = [
            {
              id: '1',
              userId: '1',
              username: 'andagreen',
              userAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
              imageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=500&fit=crop',
              caption: 'Beautiful sunset at the beach! 🌅',
              likes: 42,
              comments: 5,
              timestamp: new Date(Date.now() - 3600000),
              liked: false
            },
            {
              id: '2',
              userId: '2',
              username: 'janedoe',
              userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=40&h=40&fit=crop&crop=face',
              imageUrl: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=500&h=500&fit=crop',
              caption: 'Coffee and coding ☕️💻',
              likes: 23,
              comments: 3,
              timestamp: new Date(Date.now() - 7200000),
              liked: true
            }
          ];
          callback({ docs: posts.map(post => ({ id: post.id, data: () => post })) });
        }
      })
    })
  },
  storage: {
    ref: (path) => ({
      put: (file) => Promise.resolve({
        ref: {
          getDownloadURL: () => Promise.resolve(URL.createObjectURL(file))
        }
      })
    })
  }
};

const InstagramClone = () => {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    
    Firebase.auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        setShowAuthModal(false);
        loadPosts();
      }
    });
  }, []);

  const loadPosts = () => {
    Firebase.firestore.collection('posts').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(postsData);
    });
  };

  const handleAuth = async () => {
    setLoading(true);
    
    try {
      if (isLogin) {
        const result = await Firebase.auth.signInWithEmailAndPassword(email, password);
        Firebase.auth.currentUser = result.user;
        setUser(result.user);
      } else {
        const result = await Firebase.auth.createUserWithEmailAndPassword(email, password);
        Firebase.auth.currentUser = result.user;
        setUser(result.user);
      }
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await Firebase.auth.signOut();
    Firebase.auth.currentUser = null;
    setUser(null);
    setShowAuthModal(true);
  };

  const handleLike = async (postId) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex !== -1) {
      const updatedPosts = [...posts];
      updatedPosts[postIndex].liked = !updatedPosts[postIndex].liked;
      updatedPosts[postIndex].likes += updatedPosts[postIndex].liked ? 1 : -1;
      setPosts(updatedPosts);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    setLoading(true);
    try {
      const storageRef = Firebase.storage.ref(`posts/${Date.now()}`);
      const uploadTask = await storageRef.put(uploadFile);
      const downloadURL = await uploadTask.ref.getDownloadURL();

      const newPost = {
        userId: user.uid,
        username: user.displayName,
        userAvatar: `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face`,
        imageUrl: downloadURL,
        caption,
        likes: 0,
        comments: 0,
        timestamp: new Date(),
        liked: false
      };

      await Firebase.firestore.collection('posts').add(newPost);
      
      setUploadFile(null);
      setCaption('');
      setShowUploadModal(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Instagram</h1>
            <p className="text-gray-600">Connect with friends and share your moments</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Loading...' : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </div>
          
          <div className="text-center mt-6">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-500 hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Instagram</h1>
          
          <div className="flex-1 max-w-md mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <PlusSquare className="w-6 h-6" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Posts Feed */}
          <div className="lg:col-span-2 space-y-6">
            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Post Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <img
                      src={post.userAvatar}
                      alt={post.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{post.username}</h3>
                      <p className="text-sm text-gray-500">{formatTimeAgo(post.timestamp)}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Image */}
                <img
                  src={post.imageUrl}
                  alt="Post"
                  className="w-full h-96 object-cover"
                />

                {/* Post Actions */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`p-2 rounded-lg ${post.liked ? 'text-red-500' : 'hover:bg-gray-100'}`}
                      >
                        <Heart className={`w-6 h-6 ${post.liked ? 'fill-current' : ''}`} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MessageCircle className="w-6 h-6" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Send className="w-6 h-6" />
                      </button>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded-lg">
                      <Bookmark className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900">
                      {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                    </p>
                    <p className="text-gray-900">
                      <span className="font-semibold">{post.username}</span> {post.caption}
                    </p>
                    {post.comments > 0 && (
                      <button className="text-gray-500 hover:underline">
                        View all {post.comments} comments
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
                  alt={user.displayName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{user.displayName}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Suggestions for you</h4>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={`https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face&sig=${i}`}
                        alt="User"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-semibold text-sm">user{i}</p>
                        <p className="text-xs text-gray-500">Suggested for you</p>
                      </div>
                    </div>
                    <button className="text-blue-500 text-sm font-semibold hover:underline">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create New Post</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              {uploadFile && (
                <img
                  src={URL.createObjectURL(uploadFile)}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              
              <textarea
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              />
              
              <button
                onClick={handleUpload}
                disabled={loading || !uploadFile}
                className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Share Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstagramClone;