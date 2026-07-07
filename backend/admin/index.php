<?php
session_start();

// Simple authentication check
if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

require_once '../config.php';

// Fetch all movies
$stmt = $pdo->query("SELECT * FROM public_domain_movies ORDER BY year DESC, title ASC");
$movies = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CineHub Admin - Public Domain Movies</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        body {
            background-color: #f5f5f5;
            color: #333;
        }
        .navbar {
            background-color: #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .navbar-brand {
            color: #007bff !important;
            font-weight: bold;
        }
        .nav-link {
            color: #555 !important;
        }
        .nav-link:hover {
            color: #007bff !important;
        }
        .nav-tabs .nav-link {
            color: #555;
            border-color: #dee2e6;
        }
        .nav-tabs .nav-link.active {
            color: #007bff;
            background-color: #fff;
            border-color: #dee2e6 #dee2e6 #fff;
        }
        .table {
            background-color: #fff;
            color: #333;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .table thead th {
            background-color: #f8f9fa;
            border-color: #dee2e6;
            color: #495057;
        }
        .table tbody td {
            border-color: #dee2e6;
        }
        .btn-primary {
            background-color: #007bff;
            border-color: #007bff;
        }
        .btn-primary:hover {
            background-color: #0056b3;
            border-color: #0056b3;
        }
        .card {
            background-color: #fff;
            border-color: #dee2e6;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .card-header {
            background-color: #f8f9fa;
            border-color: #dee2e6;
            color: #495057;
        }
        .form-control {
            background-color: #fff;
            border-color: #ced4da;
            color: #333;
        }
        .form-control:focus {
            background-color: #fff;
            border-color: #80bdff;
            color: #333;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
        }
        .badge-success {
            background-color: #28a745;
        }
        .modal-content {
            background-color: #fff;
            color: #333;
        }
        .modal-header {
            border-color: #dee2e6;
        }
        .modal-footer {
            border-color: #dee2e6;
        }
        .text-muted {
            color: #6c757d !important;
        }
        a {
            color: #007bff;
        }
        a:hover {
            color: #0056b3;
        }
    </style>
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-light">
        <div class="container">
            <a class="navbar-brand" href="index.php">
                <i class="fas fa-film me-2"></i>CineHub Admin
            </a>
            <div class="navbar-nav ms-auto">
                <a class="nav-link" href="../index.php" target="_blank">
                    <i class="fas fa-external-link-alt me-1"></i> View Site
                </a>
                <a class="nav-link" href="#" data-bs-toggle="modal" data-bs-target="#changePasswordModal">
                    <i class="fas fa-key me-1"></i> Change Password
                </a>
                <a class="nav-link" href="logout.php">
                    <i class="fas fa-sign-out-alt me-1"></i> Logout
                </a>
            </div>
        </div>
    </nav>

    <div class="container mt-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <ul class="nav nav-tabs">
                <li class="nav-item">
                    <a class="nav-link active" href="#" onclick="showSection('movies'); return false;">
                        <i class="fas fa-database me-2"></i>Movies
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showSection('analytics'); return false;">
                        <i class="fas fa-chart-line me-2"></i>Analytics
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showSection('performance'); return false;">
                        <i class="fas fa-tachometer-alt me-2"></i>Performance
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" onclick="showSection('optimization'); return false;">
                        <i class="fas fa-sliders-h me-2"></i>Optimization
                    </a>
                </li>
            </ul>
            <button class="btn btn-primary" id="addMovieBtn" data-bs-toggle="modal" data-bs-target="#addMovieModal">
                <i class="fas fa-plus me-2"></i>Add Movie
            </button>
        </div>

        <!-- Movies Section -->
        <div id="moviesSection">
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>TMDB ID</th>
                                <th>Title</th>
                                <th>Year</th>
                                <th>Source</th>
                                <th>Download URL</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($movies)): ?>
                                <tr>
                                    <td colspan="8" class="text-center py-4">
                                        <i class="fas fa-inbox fa-2x mb-3"></i>
                                        <p>No public domain movies found.</p>
                                        <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addMovieModal">
                                            Add First Movie
                                        </button>
                                    </td>
                                </tr>
                            <?php else: ?>
                                <?php foreach ($movies as $movie): ?>
                                    <tr>
                                        <td><?= $movie['id'] ?></td>
                                        <td>
                                            <a href="https://www.themoviedb.org/movie/<?= $movie['tmdb_id'] ?>" target="_blank" class="text-decoration-none">
                                                <?= $movie['tmdb_id'] ?> <i class="fas fa-external-link-alt fa-xs"></i>
                                            </a>
                                        </td>
                                        <td><?= htmlspecialchars($movie['title']) ?></td>
                                        <td><?= $movie['year'] ?? 'N/A' ?></td>
                                        <td><?= htmlspecialchars($movie['source']) ?></td>
                                        <td>
                                            <a href="<?= htmlspecialchars($movie['download_url']) ?>" target="_blank" class="text-decoration-none text-truncate d-block" style="max-width: 200px;">
                                                <?= htmlspecialchars(substr($movie['download_url'], 0, 30)) ?>...
                                            </a>
                                        </td>
                                        <td><?= date('M d, Y', strtotime($movie['created_at'])) ?></td>
                                        <td>
                                            <button class="btn btn-sm btn-outline-primary me-1" onclick="editMovie(<?= $movie['id'] ?>)">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="btn btn-sm btn-outline-danger" onclick="deleteMovie(<?= $movie['id'] ?>)">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        </div>

        <!-- Analytics Section -->
        <div id="analyticsSection">
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-success" id="totalPageViews">-</h3>
                            <small>Total Page Views</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-primary" id="totalProviderClicks">-</h3>
                            <small>Provider Clicks</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-warning" id="totalSearches">-</h3>
                            <small>Search Queries</small>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h3 class="text-info" id="totalEngagement">-</h3>
                            <small>User Engagement</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="card mb-4">
                <div class="card-header">
                    <h5>Top Content by Views</h5>
                </div>
                <div class="card-body">
                    <div id="topContentList">Loading...</div>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5>Page Views by Type</h5>
                        </div>
                        <div class="card-body">
                            <div id="pageViewsByType">Loading...</div>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h5>Provider Clicks by Provider</h5>
                        </div>
                        <div class="card-body">
                            <div id="providerClicksByProvider">Loading...</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Section -->
        <div id="performanceSection" class="d-none">
            <div class="card mb-4">
                <div class="card-header">
                    <h5>API Performance Metrics (Last Hour)</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Endpoint</th>
                                    <th>Method</th>
                                    <th>Avg Response (ms)</th>
                                    <th>Requests</th>
                                    <th>Errors</th>
                                    <th>Cache Hit Rate</th>
                                </tr>
                            </thead>
                            <tbody id="apiMetricsTable">
                                <tr><td colspan="6" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h5>Cache Metrics</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Cache Key</th>
                                    <th>Type</th>
                                    <th>Hit Count</th>
                                    <th>Miss Count</th>
                                    <th>Hit Rate</th>
                                    <th>Size (bytes)</th>
                                </tr>
                            </thead>
                            <tbody id="cacheMetricsTable">
                                <tr><td colspan="6" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- Optimization Section -->
        <div id="optimizationSection" class="d-none">
            <div class="card">
                <div class="card-header">
                    <h5>Feature Flags</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Feature Name</th>
                                    <th>Enabled</th>
                                    <th>Description</th>
                                    <th>Rollout %</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="featureFlagsTable">
                                <tr><td colspan="5" class="text-center">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Change Password Modal -->
    <div class="modal fade" id="changePasswordModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Change Password</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="changePasswordForm">
                        <div class="mb-3">
                            <label for="currentPassword" class="form-label">Current Password *</label>
                            <input type="password" class="form-control" id="currentPassword" required>
                        </div>
                        <div class="mb-3">
                            <label for="newPassword" class="form-label">New Password *</label>
                            <input type="password" class="form-control" id="newPassword" required minlength="6">
                            <small class="text-muted">Minimum 6 characters</small>
                        </div>
                        <div class="mb-3">
                            <label for="confirmPassword" class="form-label">Confirm New Password *</label>
                            <input type="password" class="form-control" id="confirmPassword" required minlength="6">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="changePassword()">Change Password</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Add/Edit Movie Modal -->
    <div class="modal fade" id="movieModal" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="movieModalTitle">Add Movie</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="movieForm">
                        <input type="hidden" id="movieId">
                        <div class="mb-3">
                            <label for="tmdbId" class="form-label">TMDB ID *</label>
                            <input type="number" class="form-control" id="tmdbId" required>
                            <small class="text-muted">Find TMDB ID at <a href="https://www.themoviedb.org/" target="_blank" class="text-decoration-none">themoviedb.org</a></small>
                        </div>
                        <div class="mb-3">
                            <label for="title" class="form-label">Title *</label>
                            <input type="text" class="form-control" id="title" required>
                        </div>
                        <div class="mb-3">
                            <label for="downloadUrl" class="form-label">Download URL *</label>
                            <input type="url" class="form-control" id="downloadUrl" required>
                            <small class="text-muted">Direct MP4 download link</small>
                        </div>
                        <div class="mb-3">
                            <label for="source" class="form-label">Source</label>
                            <input type="text" class="form-control" id="source" value="Internet Archive">
                        </div>
                        <div class="mb-3">
                            <label for="year" class="form-label">Year</label>
                            <input type="number" class="form-control" id="year">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveMovie()">Save</button>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script>
        const modal = new bootstrap.Modal(document.getElementById('movieModal'));
        const modalTitle = document.getElementById('movieModalTitle');
        const movieForm = document.getElementById('movieForm');

        // Section switching
        function showSection(section) {
            // Hide all sections
            document.getElementById('moviesSection').classList.add('d-none');
            document.getElementById('analyticsSection').classList.add('d-none');
            document.getElementById('performanceSection').classList.add('d-none');
            document.getElementById('optimizationSection').classList.add('d-none');
            
            // Remove active class from all nav links
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            
            // Show selected section
            document.getElementById(section + 'Section').classList.remove('d-none');
            
            // Add active class to clicked link
            event.target.classList.add('active');
            
            // Show/hide add movie button
            const addBtn = document.getElementById('addMovieBtn');
            if (section === 'movies') {
                addBtn.classList.remove('d-none');
            } else {
                addBtn.classList.add('d-none');
            }
            
            // Load section-specific data
            if (section === 'analytics') {
                loadAnalyticsData();
            } else if (section === 'performance') {
                loadPerformanceData();
            } else if (section === 'optimization') {
                loadOptimizationData();
            }
        }

        // Load analytics data
        function loadAnalyticsData() {
            fetch('../api/analytics.php?dashboard=true')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        document.getElementById('totalPageViews').textContent = data.data.page_views.total.toLocaleString();
                        document.getElementById('totalProviderClicks').textContent = data.data.provider_clicks.total.toLocaleString();
                        document.getElementById('totalSearches').textContent = data.data.search_queries.total.toLocaleString();
                        document.getElementById('totalEngagement').textContent = data.data.engagement.total.toLocaleString();
                        
                        // Top content
                        let topContentHtml = '<ul class="list-group">';
                        data.data.top_content.forEach(item => {
                            topContentHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>${item.content_type.toUpperCase()} #${item.content_id}</span>
                                <span class="badge bg-primary">${item.views} views</span>
                            </li>`;
                        });
                        topContentHtml += '</ul>';
                        document.getElementById('topContentList').innerHTML = topContentHtml || 'No data available';
                        
                        // Page views by type
                        let pageViewsHtml = '<ul class="list-group">';
                        data.data.page_views.by_page_type.forEach(item => {
                            pageViewsHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>${item.page_type}</span>
                                <span class="badge bg-secondary">${item.count}</span>
                            </li>`;
                        });
                        pageViewsHtml += '</ul>';
                        document.getElementById('pageViewsByType').innerHTML = pageViewsHtml || 'No data available';
                        
                        // Provider clicks
                        let providerHtml = '<ul class="list-group">';
                        data.data.provider_clicks.by_provider.forEach(item => {
                            providerHtml += `<li class="list-group-item d-flex justify-content-between align-items-center">
                                <span>${item.provider}</span>
                                <span class="badge bg-info">${item.count}</span>
                            </li>`;
                        });
                        providerHtml += '</ul>';
                        document.getElementById('providerClicksByProvider').innerHTML = providerHtml || 'No data available';
                    }
                })
                .catch(error => {
                    console.error('Error loading analytics:', error);
                    document.getElementById('totalPageViews').textContent = 'Error';
                });
        }

        // Load performance data
        function loadPerformanceData() {
            fetch('../api/performance.php?type=dashboard')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // API metrics
                        let apiHtml = '';
                        data.data.api_metrics.forEach(item => {
                            apiHtml += `<tr>
                                <td>${item.endpoint}</td>
                                <td>${item.method}</td>
                                <td>${item.avg_response.toFixed(2)}</td>
                                <td>${item.requests}</td>
                                <td>${item.errors}</td>
                                <td>${item.cache_hit_rate.toFixed(1)}%</td>
                            </tr>`;
                        });
                        document.getElementById('apiMetricsTable').innerHTML = apiHtml || '<tr><td colspan="6" class="text-center">No data available</td></tr>';
                        
                        // Cache metrics
                        let cacheHtml = '';
                        data.data.cache_metrics.forEach(item => {
                            cacheHtml += `<tr>
                                <td>${item.cache_key.substring(0, 50)}...</td>
                                <td>${item.cache_type}</td>
                                <td>${item.hit_count}</td>
                                <td>${item.miss_count}</td>
                                <td>${item.hit_rate.toFixed(1)}%</td>
                                <td>${item.size_bytes ? (item.size_bytes / 1024).toFixed(2) + ' KB' : 'N/A'}</td>
                            </tr>`;
                        });
                        document.getElementById('cacheMetricsTable').innerHTML = cacheHtml || '<tr><td colspan="6" class="text-center">No data available</td></tr>';
                    }
                })
                .catch(error => {
                    console.error('Error loading performance:', error);
                });
        }

        // Load optimization data
        function loadOptimizationData() {
            fetch('../api/performance.php?type=feature_flags')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        let flagsHtml = '';
                        data.data.forEach(flag => {
                            flagsHtml += `<tr>
                                <td>${flag.feature_name}</td>
                                <td>
                                    <span class="badge ${flag.is_enabled ? 'bg-success' : 'bg-secondary'}">
                                        ${flag.is_enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </td>
                                <td>${flag.description || 'N/A'}</td>
                                <td>${flag.rollout_percentage}%</td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary" onclick="toggleFeature('${flag.feature_name}', ${!flag.is_enabled})">
                                        ${flag.is_enabled ? 'Disable' : 'Enable'}
                                    </button>
                                </td>
                            </tr>`;
                        });
                        document.getElementById('featureFlagsTable').innerHTML = flagsHtml || '<tr><td colspan="5" class="text-center">No data available</td></tr>';
                    }
                })
                .catch(error => {
                    console.error('Error loading optimization:', error);
                });
        }

        // Toggle feature flag
        function toggleFeature(featureName, isEnabled) {
            fetch('../api/performance.php?type=feature_flags', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    feature_name: featureName,
                    is_enabled: isEnabled
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    loadOptimizationData();
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => console.error('Error:', error));
        }

        // Show add modal
        document.getElementById('addMovieModal').addEventListener('click', function() {
            modalTitle.textContent = 'Add Movie';
            movieForm.reset();
            document.getElementById('movieId').value = '';
            document.getElementById('source').value = 'Internet Archive';
            modal.show();
        });

        // Edit movie
        function editMovie(id) {
            fetch(`../api/movies.php?id=${id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        modalTitle.textContent = 'Edit Movie';
                        document.getElementById('movieId').value = data.data.id;
                        document.getElementById('tmdbId').value = data.data.tmdb_id;
                        document.getElementById('title').value = data.data.title;
                        document.getElementById('downloadUrl').value = data.data.download_url;
                        document.getElementById('source').value = data.data.source;
                        document.getElementById('year').value = data.data.year || '';
                        modal.show();
                    }
                })
                .catch(error => console.error('Error:', error));
        }

        // Save movie
        function saveMovie() {
            const movieId = document.getElementById('movieId').value;
            const movieData = {
                tmdb_id: parseInt(document.getElementById('tmdbId').value),
                title: document.getElementById('title').value,
                download_url: document.getElementById('downloadUrl').value,
                source: document.getElementById('source').value,
                year: document.getElementById('year').value ? parseInt(document.getElementById('year').value) : null
            };

            const url = movieId ? `../api/movies.php?id=${movieId}` : '../api/movies.php';
            const method = movieId ? 'PUT' : 'POST';

            fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movieData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    location.reload();
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => console.error('Error:', error));
        }

        // Delete movie
        function deleteMovie(id) {
            if (confirm('Are you sure you want to delete this movie?')) {
                fetch(`../api/movies.php?id=${id}`, { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert(data.message);
                            location.reload();
                        } else {
                            alert('Error: ' + data.error);
                        }
                    })
                    .catch(error => console.error('Error:', error));
            }
        }

        // Change password
        function changePassword() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validation
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Please fill in all fields');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }

            if (newPassword.length < 6) {
                alert('Password must be at least 6 characters');
                return;
            }

            // Send change password request
            fetch('change_password.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
                    modal.hide();
                    // Clear form
                    document.getElementById('changePasswordForm').reset();
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to change password');
            });
        }
    </script>
</body>
</html>
