import { create } from "zustand";
import axios from "axios";

const API_BASE = 'https://wrap-up-onechain.onrender.com/api';

export const useArticleStore = create((set, get) => ({
  // 1. STATE
  articles: [],
  selectedArticle: null,
  selectedResearch: null, 
  userPoints: 0,
  displayName: '',
  
  // NEW ONECHAIN STATE: We need to track the Object ID of the user's profile 
  // so we can pass it into smart contract calls!
  profileObjectId: null, 
  
  // 2. SETTERS
  setUserPoints: (points) => set({ userPoints: points }),
  setDisplayName: (name) => set({ displayName: name }),
  
  // NEW ONECHAIN SETTER
  setProfileObjectId: (id) => set({ profileObjectId: id }),
  
  // 3. ARTICLE API FUNCTIONS (Existing - unchanged)
  
  loadAllArticles: async () => {
    try {
      const res = await axios.get(`${API_BASE}/articles/all`);
      set({ articles: res.data });
      return res.data;
    } catch (error) {
      console.error('Load all articles error:', error);
      throw new Error('Failed to load articles');
    }
  },
  
  loadArticle: async (id) => {
    try {
      set({ selectedArticle: null });
      const res = await axios.get(`${API_BASE}/articles/${id}`);
      set({ selectedArticle: res.data });
      return res.data;
    } catch (error) {
      console.error('Load article error:', error);
      throw new Error('Failed to load article');
    }
  },
  
  markArticleOnChainDB: async (articleUrl, articleId, curator, ipfsHash) => {
    try {
      await axios.post(`${API_BASE}/articles/mark-onchain`, {
        articleUrl,
        articleId,
        curator,
        ipfsHash
      });
      console.log('✅ Article marked as on-chain in DB');
    } catch (error) {
       console.error('DB mark-onchain error:', error);
       throw new Error(error.message || 'Failed to mark article on-chain in DB');
    }
  },

  syncArticleUpvotesDB: async (articleUrl, upvotes) => {
     try {
        await axios.post(`${API_BASE}/articles/sync-upvotes`, {
          articleUrl,
          upvotes
        });
        console.log('✅ Article upvotes synced to DB');
     } catch (error) {
        console.error('DB sync upvotes error:', error);
        throw new Error(error.message || 'Failed to sync upvotes in DB');
     }
  },
  
  prepareCommentForChain: async ({ articleId, articleUrl, content, author, authorName, parentId }) => {
    try {
      console.log('💬 Preparing comment...');
      
      const res1 = await axios.post(`${API_BASE}/comments`, {
        articleId,
        articleUrl,
        content,
        author,
        authorName,
        parentId: parentId || null
      });
      const commentMongoId = res1.data.id;
      console.log('📝 Comment saved to DB:', commentMongoId);
      
      const res2 = await axios.post(`${API_BASE}/comments/upload-ipfs`, {
        commentId: commentMongoId,
        content,
        author,
        authorName,
        articleUrl
      });
      const { ipfsHash } = res2.data;
      console.log('📤 Comment uploaded to IPFS:', ipfsHash);

      const article = await axios.get(`${API_BASE}/articles/by-url?url=${encodeURIComponent(articleUrl)}`);
      // Note: In OneChain, onChainArticleId will be a string (e.g., "0x123...abc") instead of a uint256
      const onChainArticleId = article.data.articleId;

      if (!onChainArticleId) {
        throw new Error('Article not on-chain yet');
      }
      
      return { commentMongoId, onChainArticleId, ipfsHash };
      
    } catch (error) {
      console.error('Prepare comment error:', error);
      throw new Error(error.message || 'Failed to prepare comment');
    }
  },
  
  markCommentOnChainDB: async (commentMongoId, onChainCommentId, ipfsHash) => {
    try {
      await axios.post(`${API_BASE}/comments/mark-onchain`, {
        commentId: commentMongoId,
        onChainCommentId,
        ipfsHash
      });
      console.log('✅ Comment marked as on-chain in DB');
    } catch (error) {
      console.error('DB mark-onchain error:', error);
      throw new Error(error.message || 'Failed to mark comment on-chain in DB');
    }
  },

  syncCommentUpvotesDB: async (commentMongoId, upvotes) => {
    try {
      await axios.post(`${API_BASE}/comments/sync-upvotes`, {
        commentId: commentMongoId,
        upvotes
      });
      console.log('✅ Comment upvotes synced to DB');
    } catch (error) {
      console.error('DB sync comment upvotes error:', error);
      throw new Error(error.message || 'Failed to sync comment upvotes in DB');
    }
  },

  // ===== RESEARCH API FUNCTIONS =====
  
  loadResearch: async (id) => {
    try {
      set({ selectedResearch: null });
      const res = await axios.get(`${API_BASE}/research/${id}`);
      set({ selectedResearch: res.data });
      return res.data;
    } catch (error) {
      console.error('Load research error:', error);
      throw new Error('Failed to load research');
    }
  },
  
  uploadResearchToIPFS: async (researchId) => {
    try {
      console.log('📤 Uploading research to IPFS...');
      const res = await axios.post(`${API_BASE}/research/upload-ipfs`, {
        researchId
      });
      console.log('✅ Research uploaded to IPFS:', res.data.ipfsHash);
      return res.data.ipfsHash;
    } catch (error) {
      console.error('Upload research to IPFS error:', error);
      throw new Error(error.message || 'Failed to upload research to IPFS');
    }
  },
  
  markResearchOnChainDB: async (researchId, blockchainId, curator, ipfsHash) => {
    try {
      await axios.post(`${API_BASE}/research/mark-onchain`, {
        researchId,
        blockchainId,
        curator,
        ipfsHash
      });
      console.log('✅ Research marked as on-chain in DB');
    } catch (error) {
      console.error('DB mark research on-chain error:', error);
      throw new Error(error.message || 'Failed to mark research on-chain in DB');
    }
  },
  
  syncResearchUpvotesDB: async (researchId, upvotes) => {
    try {
      await axios.post(`${API_BASE}/research/sync-upvotes`, {
        researchId,
        upvotes
      });
      console.log('✅ Research upvotes synced to DB');
    } catch (error) {
      console.error('DB sync research upvotes error:', error);
      throw new Error(error.message || 'Failed to sync research upvotes in DB');
    }
  },
  
  prepareResearchCommentForChain: async ({ researchId, content, author, authorName, parentId }) => {
    try {
      console.log('💬 Preparing research comment...');
      
      const res1 = await axios.post(`${API_BASE}/research/comments`, {
        researchId,
        content,
        author,
        authorName,
        parentId: parentId || null
      });
      const commentMongoId = res1.data.id;
      console.log('📝 Research comment saved to DB:', commentMongoId);
      
      const res2 = await axios.post(`${API_BASE}/research/comments/upload-ipfs`, {
        commentId: commentMongoId,
        content,
        author,
        authorName,
        researchId
      });
      const { ipfsHash } = res2.data;
      console.log('📤 Research comment uploaded to IPFS:', ipfsHash);

      const research = await axios.get(`${API_BASE}/research/${researchId}`);
      const onChainResearchId = research.data.blockchainId;

      if (!onChainResearchId) {
        throw new Error('Research not on-chain yet');
      }
      
      return { commentMongoId, onChainResearchId, ipfsHash };
      
    } catch (error) {
      console.error('Prepare research comment error:', error);
      throw new Error(error.message || 'Failed to prepare research comment');
    }
  },
  
  markResearchCommentOnChainDB: async (commentMongoId, onChainCommentId, ipfsHash) => {
    try {
      await axios.post(`${API_BASE}/research/comments/mark-onchain`, {
        commentId: commentMongoId,
        onChainCommentId,
        ipfsHash
      });
      console.log('✅ Research comment marked as on-chain in DB');
    } catch (error) {
      console.error('DB mark research comment on-chain error:', error);
      throw new Error(error.message || 'Failed to mark research comment on-chain in DB');
    }
  },
  
  syncResearchCommentUpvotesDB: async (commentMongoId, upvotes) => {
    try {
      await axios.post(`${API_BASE}/research/comments/sync-upvotes`, {
        commentId: commentMongoId,
        upvotes
      });
      console.log('✅ Research comment upvotes synced to DB');
    } catch (error) {
      console.error('DB sync research comment upvotes error:', error);
      throw new Error(error.message || 'Failed to sync research comment upvotes in DB');
    }
  },

  deleteArticleFromDB: async (id) => {
    try {
      await axios.delete(`${API_BASE}/articles/${id}`);
      console.log('🗑️ Cleaned up off-chain article:', id);
    } catch (error) {
      console.error('Failed to cleanup article:', error);
    }
  },

  deleteComparisonFromDB: async (id) => {
    try {
      await axios.delete(`${API_BASE}/comparisons/${id}`);
      console.log('🗑️ Cleaned up off-chain comparison:', id);
    } catch (error) {
      console.error('Failed to cleanup comparison:', error);
    }
  },

  deleteResearchFromDB: async (id) => {
    try {
      await axios.delete(`${API_BASE}/research/${id}`);
      console.log('🗑️ Cleaned up off-chain research:', id);
    } catch (error) {
      console.error('Failed to cleanup research:', error);
    }
  },
}));
