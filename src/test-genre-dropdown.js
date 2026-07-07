// Quick test to verify GenreDropdown component works
// Run this in browser console to test the dropdown functionality

const testGenreDropdown = () => {
  console.log('🎬 Testing GenreDropdown Component...');
  
  // Test if GenreDropdown is accessible
  if (typeof window !== 'undefined') {
    const genreDropdownElement = document.querySelector('.genre-dropdown');
    if (genreDropdownElement) {
      console.log('✅ GenreDropdown element found in DOM');
      
      // Test dropdown toggle
      const toggleButton = genreDropdownElement.querySelector('.dropdown-toggle');
      if (toggleButton) {
        console.log('✅ Dropdown toggle button found');
        
        // Simulate click to open dropdown
        setTimeout(() => {
          toggleButton.click();
          setTimeout(() => {
            const dropdownMenu = genreDropdownElement.querySelector('.dropdown-menu');
            if (dropdownMenu && dropdownMenu.classList.contains('show')) {
              console.log('✅ Dropdown menu opened successfully');
              
              // Check if genres are loaded
              const dropdownItems = dropdownMenu.querySelectorAll('.dropdown-item');
              console.log(`📊 Found ${dropdownItems.length} genre items`);
              
              if (dropdownItems.length > 0) {
                dropdownItems[0].click();
                setTimeout(() => {
                  console.log('✅ Genre clicked, should navigate to genre movies page');
                }, 500);
              } else {
                console.log('❌ No genre items found - API might have failed');
              }
            } else {
              console.log('❌ Dropdown menu did not open');
            }
          }, 500);
        }, 100);
      } else {
        console.log('❌ Dropdown toggle button not found');
      }
    } else {
      console.log('❌ GenreDropdown element not found in DOM');
    }
  } else {
    console.log('❌ Not running in browser environment');
  }
};

// Auto-run test if this file is executed directly
if (typeof window === 'undefined') {
  testGenreDropdown();
}

export { testGenreDropdown };
