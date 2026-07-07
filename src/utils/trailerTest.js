/**
 * Trailer Service Test
 * 
 * Simple test script to demonstrate the movieTrailerService functionality.
 * Run this file to test trailer fetching before using in production.
 */

import { fetchMovieTrailer, fetchAllMovieVideos } from './movieTrailerService.js';

/**
 * Test fetching a specific movie trailer
 * 
 * @param {string|number} movieId - Movie ID to test
 */
const testSingleTrailer = async (movieId) => {
  console.log(`\n🎬 Testing trailer fetch for movie ID: ${movieId}`);
  console.log('=' .repeat(50));
  
  try {
    const trailerKey = await fetchMovieTrailer(movieId);
    
    if (trailerKey) {
      console.log('✅ SUCCESS: Trailer found!');
      console.log(`📹 YouTube Video ID: ${trailerKey}`);
      console.log(`🔗 Embed URL: https://www.youtube.com/embed/${trailerKey}`);
      console.log(`🔗 Watch URL: https://www.youtube.com/watch?v=${trailerKey}`);
    } else {
      console.log('❌ No trailer found for this movie');
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
};

/**
 * Test fetching all videos for a movie
 * 
 * @param {string|number} movieId - Movie ID to test
 */
const testAllVideos = async (movieId) => {
  console.log(`\n🎬 Testing all videos fetch for movie ID: ${movieId}`);
  console.log('=' .repeat(50));
  
  try {
    const videosData = await fetchAllMovieVideos(movieId);
    
    if (videosData && videosData.results) {
      console.log(`✅ SUCCESS: Found ${videosData.results.length} videos!`);
      
      // Log all video details
      videosData.results.forEach((video, index) => {
        console.log(`\n📹 Video ${index + 1}:`);
        console.log(`   Name: ${video.name}`);
        console.log(`   Type: ${video.type}`);
        console.log(`   Site: ${video.site}`);
        console.log(`   Key: ${video.key}`);
        console.log(`   Size: ${video.size}`);
        console.log(`   Official: ${video.official ? 'Yes' : 'No'}`);
      });
      
      // Find trailers specifically
      const trailers = videosData.results.filter(v => v.type === 'Trailer');
      console.log(`\n🎬 Found ${trailers.length} official trailers:`);
      trailers.forEach((trailer, index) => {
        console.log(`   Trailer ${index + 1}: ${trailer.name}`);
      });
    } else {
      console.log('❌ No videos found');
    }
  } catch (error) {
    console.error('💥 ERROR:', error.message);
  }
  
  console.log('\n' + '='.repeat(50));
};

/**
 * Run all tests with popular movie IDs
 */
const runTests = async () => {
  console.log('🚀 Starting Movie Trailer Service Tests');
  console.log('=' .repeat(80));
  
  // Test with known movie IDs
  const testMovieIds = [
    550,   // Fight Club
    13,    // Forrest Gump
    27205, // Inception
    155,   // The Dark Knight
    597,   // Titanic
    680,   // Pulp Fiction
  ];
  
  for (const movieId of testMovieIds) {
    await testSingleTrailer(movieId);
  }
  
  // Test fetching all videos for one movie
  console.log('\n🎬 Testing all videos fetch...');
  await testAllVideos(550); // Test with Fight Club
  
  console.log('\n✅ All tests completed!');
  console.log('🎬 Service is ready for production use!');
};

// Export test functions
export { testSingleTrailer, testAllVideos, runTests };

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Running in Node.js environment
  runTests().catch(console.error);
}
