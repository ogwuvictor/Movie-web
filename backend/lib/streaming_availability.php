<?php
// Shared by the public catalog API and authenticated admin editor.
function streamingCatalogPath() {
    return dirname(__DIR__, 2) . '/public/streaming-availability.json';
}

function readStreamingCatalog() {
    $path = streamingCatalogPath();
    if (!is_file($path)) return ['movies' => []];
    $catalog = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($catalog) || !isset($catalog['movies']) || !is_array($catalog['movies'])) {
        throw new RuntimeException('Invalid catalog format');
    }
    return $catalog;
}

function streamingMovieId($value) {
    $id = (string)$value;
    if (!preg_match('/^[1-9][0-9]{0,15}$/D', $id) || (float)$id > 9007199254740991) {
        throw new InvalidArgumentException('TMDB movie ID must be a positive integer.');
    }
    return $id;
}

function validateStreamingRecord($input) {
    if (!is_array($input)) throw new InvalidArgumentException('A JSON object is required.');
    $id = streamingMovieId($input['tmdbId'] ?? '');
    $title = $input['title'] ?? '';
    if (!is_string($title) || !strlen(trim($title)) || strlen($title) > 240) {
        throw new InvalidArgumentException('Enter a title of at most 240 characters.');
    }
    if (!isset($input['available']) || !is_bool($input['available'])) {
        throw new InvalidArgumentException('Availability must be true or false.');
    }
    $allowed = ['vidlink', 'videasy', 'vidfast', 'movies111'];
    $servers = $input['serverIds'] ?? [];
    if (!is_array($servers) || count($servers) > 4 || array_filter($servers, function ($id) use ($allowed) { return !is_string($id) || !in_array($id, $allowed, true); })) {
        throw new InvalidArgumentException('Select valid streaming servers.');
    }
    $servers = array_values(array_unique($servers));
    $minutes = filter_var($input['validMinutes'] ?? null, FILTER_VALIDATE_INT);
    if ($minutes === false || $minutes < 1 || $minutes > 1440) {
        throw new InvalidArgumentException('Confirmation must expire within 1 to 1440 minutes.');
    }
    if ($input['available'] && (!$servers || ($input['confirmed'] ?? false) !== true)) {
        throw new InvalidArgumentException('Confirm playback on the selected servers before marking the title available.');
    }
    $now = time();
    return [$id, [
        'title' => trim($title), 'available' => $input['available'], 'serverIds' => $servers,
        'checkedAt' => gmdate('Y-m-d\TH:i:s\Z', $now),
        'expiresAt' => gmdate('Y-m-d\TH:i:s\Z', $now + $minutes * 60),
    ]];
}

function updateStreamingCatalog($mutate) {
    $lockDir = dirname(__DIR__) . '/data';
    if (!is_dir($lockDir) && !mkdir($lockDir, 0700, true) && !is_dir($lockDir)) {
        throw new RuntimeException('Cannot create catalog storage.');
    }
    $lock = fopen($lockDir . '/streaming-catalog.lock', 'c');
    if (!$lock) throw new RuntimeException('Cannot lock catalog storage.');
    $temp = null;
    try {
        if (!flock($lock, LOCK_EX)) throw new RuntimeException('Cannot lock catalog storage.');
        $catalog = $mutate(readStreamingCatalog());
        $catalog['movies'] = (object)$catalog['movies'];
        $json = json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        $temp = tempnam(dirname(streamingCatalogPath()), 'catalog-');
        if (!$temp || file_put_contents($temp, $json) !== strlen($json) || !rename($temp, streamingCatalogPath())) {
            throw new RuntimeException('Cannot save the availability catalog.');
        }
        $temp = null;
        return $catalog;
    } finally {
        if ($temp && is_file($temp)) unlink($temp);
        flock($lock, LOCK_UN);
        fclose($lock);
    }
}
