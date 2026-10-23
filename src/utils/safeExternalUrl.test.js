import { buildProviderUrl } from './providerLinkService';
import { safeExternalUrl } from './safeExternalUrl';
test.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '//evil.test', 'https://user:pass@example.com', 'http://example.com', null, {}])('rejects unsafe outbound URL %p', value => expect(safeExternalUrl(value)).toBeNull());
test.each(['https://archive.org/download/sample.mp4', 'http://localhost:8000/movie.mp4'])('accepts HTTPS and local test links %s', value => expect(safeExternalUrl(value)).toBe(value));

test.each(['__proto__', 'constructor', 'not-a-provider'])('rejects unconfigured provider keys %s', key => expect(buildProviderUrl(key, 'Example')).toBeNull());
