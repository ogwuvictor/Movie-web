// Cloudflare-only dashboard additions/cleanup. Leave the legacy PHP backend intact.
module.exports = function prepareAdminUsers(dashboard,read) {
  const replace=(pattern,replacement)=>{
    if(!pattern.test(dashboard))throw Error('Dashboard source changed: '+pattern);
    dashboard=dashboard.replace(pattern,replacement);
  };
  replace(/<li class="nav-item">\s*<a class="nav-link" href="#" data-section="optimization">[\s\S]*?<\/li>/,'');
  replace(/<!-- Optimization Section -->[\s\S]*?(?=    <!-- Change Password Modal -->)/,'</div>\n');
  replace(/<div class="col-md-3">\s*<div class="card text-center">\s*<div class="card-body">\s*<h3 class="text-info" id="totalEngagement">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/,'');
  replace(/<div class="card">\s*<div class="card-header">\s*<h5>Cache Metrics<\/h5>[\s\S]*?(?=\s*<!-- Change Password Modal -->)/,'</div>\n</div>\n');
  // The cache card was the final card in Performance; preserve its section and outer container closures.
  replace(/\s*\/\/ Cache metrics[\s\S]*?(?=\s*refreshed\('performance')/,'\n');
  replace(/\s*\/\/ Load optimization data[\s\S]*?(?=\s*\/\/ Show add modal)/,'\n');
  replace(/\s*else if \(button.dataset.feature\)[^\n]+/,'');
  dashboard=dashboard.replaceAll(', [data-feature]','').replace('analytics: 0, performance: 0, optimization: 0','analytics: 0, performance: 0');
  dashboard=dashboard.replaceAll(",'totalEngagement'",'').replaceAll(",'cacheMetricsTable'",'');
  dashboard=dashboard.replace("(section === 'performance' ? ['apiMetricsTable'] : ['featureFlagsTable'])","['apiMetricsTable']");
  replace(/\s*document.getElementById\('totalEngagement'\)[^\n]+/,'');
  replace(/\s*document.getElementById\('optimizationSection'\).classList.add\('d-none'\);/,"\n            document.getElementById('usersSection').classList.add('d-none');");
  replace(/ else if \(visibleSection === 'optimization'\) loadOptimizationData\(\);/,'');
  replace(/ else if \(section === 'optimization'\) \{\s*loadOptimizationData\(\);\s*\}/,'');
  replace(/<ul class="nav nav-tabs">/,'<ul class="nav nav-tabs"><li class="nav-item"><a class="nav-link" href="#" data-section="users"><i class="fas fa-users me-2"></i>Users</a></li>');
  replace(/<!-- Movies Section -->/,read('cloudflare/admin-users.html')+'\n<!-- Movies Section -->');
  replace(/<\/body>/,'<script src="/admin/users.js" nonce="__NONCE__"></script>\n</body>');
  dashboard=dashboard.replace('href="../index.php"','href="/"').replace('align-items-center mb-4"','align-items-center mb-4 admin-toolbar"');
  replace(/<\/style>/,`.admin-toolbar { flex-wrap:wrap; gap:1rem; }
    .admin-toolbar .nav-tabs { flex-wrap:wrap; }
    .admin-users-header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:1rem; }
    .user-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:1rem; }
    .user-metrics strong { display:block; font-size:2rem; overflow-wrap:anywhere; }
    .user-metrics small { display:block; color:#666; }
    .user-chart-legend { display:flex; flex-wrap:wrap; gap:1rem; list-style:none; padding:0; }
    .user-chart-legend span { display:inline-block; width:.8rem; height:.8rem; margin-right:.35rem; border-radius:50%; }
    .daily-key { background:#0067c0; } .weekly-key { background:#167447; } .monthly-key { background:#7b3fb0; }
    .anonymous-metrics { grid-template-columns:repeat(3,minmax(0,1fr)); }
    #userActivityChart,#anonymousActivityChart { display:block; width:100%; height:auto; min-width:0; margin-bottom:1rem; }
    #usersSection { min-width:0; } #usersStatus,#usersTrackingNote { overflow-wrap:anywhere; }
    @media(max-width:767px) { .user-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); gap:.6rem; } .user-metrics .card-body { padding:.85rem; } .user-metrics strong { font-size:1.6rem; } .navbar .container { gap:.5rem; } .navbar-nav { flex-direction:row; flex-wrap:wrap; gap:.5rem; } }
    @media(max-width:359px) { .user-metrics { grid-template-columns:1fr; } }
    </style>`);
  return dashboard;
};
