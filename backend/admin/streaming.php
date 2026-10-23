<?php
session_start();
if (empty($_SESSION['admin_logged_in'])) { header('Location: login.php'); exit; }
if (empty($_SESSION['catalog_csrf'])) $_SESSION['catalog_csrf'] = bin2hex(random_bytes(32));
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?= htmlspecialchars($_SESSION['catalog_csrf'], ENT_QUOTES, 'UTF-8') ?>">
    <title>Streaming Availability | CineHub Admin</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<nav class="navbar navbar-expand bg-white border-bottom">
    <div class="container flex-wrap gap-2">
        <a class="navbar-brand fw-bold text-primary" href="index.php">CineHub Admin</a>
        <div class="d-flex gap-3"><a href="index.php">Dashboard</a><a href="logout.php">Logout</a></div>
    </div>
</nav>
<main class="container py-4">
    <h1 class="h3">Streaming Availability</h1>
    <p class="text-secondary">Maintain per-movie source confirmations separately from public-domain download records.</p>
    <div class="alert alert-info">Watch Now currently remains visible on movie pages, as requested. These records do not hide the button. Saving a record does not test a provider automatically.</div>
    <div id="catalogMessage" role="status" class="mb-3"></div>
    <div class="card mb-4"><div class="card-body">
        <h2 class="h5">Add or update a movie</h2>
        <form id="availabilityForm">
            <div class="row g-3 mb-3">
                <div class="col-sm-4"><label for="catalogTmdbId" class="form-label">TMDB movie ID</label><input id="catalogTmdbId" class="form-control" type="number" min="1" max="9007199254740991" step="1" required></div>
                <div class="col-sm-8"><label for="catalogTitle" class="form-label">Movie title</label><input id="catalogTitle" class="form-control" maxlength="240" required></div>
                <div class="col-sm-6"><label for="catalogAvailable" class="form-label">Availability</label><select id="catalogAvailable" class="form-select"><option value="true">Available</option><option value="false">Unavailable</option></select></div>
                <div class="col-sm-6"><label for="catalogValidity" class="form-label">Confirmation expires after</label><select id="catalogValidity" class="form-select"><option value="15">15 minutes</option><option value="60" selected>1 hour</option><option value="360">6 hours</option><option value="1440">24 hours</option></select></div>
            </div>
            <fieldset class="mb-3"><legend class="fs-6">Streaming servers</legend>
                <?php foreach (['vidlink' => 'VidLink Pro', 'videasy' => 'Videasy', 'vidfast' => 'Vidfast', 'movies111' => '111Movies'] as $id => $name): ?>
                    <div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" name="catalogServer" value="<?= $id ?>" id="catalog-<?= $id ?>"><label class="form-check-label" for="catalog-<?= $id ?>"><?= $name ?></label></div>
                <?php endforeach; ?>
            </fieldset>
            <div class="form-check mb-3"><input class="form-check-input" id="catalogConfirmed" type="checkbox"><label class="form-check-label" for="catalogConfirmed">I have confirmed this movie is playable on every selected server.</label></div>
            <div class="d-flex gap-2"><button class="btn btn-primary" type="submit" id="catalogSave">Save availability</button><button class="btn btn-outline-secondary" type="reset">Clear form</button></div>
        </form>
    </div></div>
    <section class="card"><div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 mb-0">Catalog records</h2><button id="catalogRefresh" class="btn btn-sm btn-outline-primary" type="button">Refresh</button></div>
        <div class="table-responsive"><table class="table align-middle"><thead><tr><th>TMDB ID</th><th>Movie</th><th>Status</th><th>Servers</th><th>Checked</th><th>Expires</th><th>Actions</th></tr></thead><tbody id="catalogRows"><tr><td colspan="7">Loading catalog…</td></tr></tbody></table></div>
    </div></section>
</main>
<script src="streaming.js" defer></script>
</body>
</html>
