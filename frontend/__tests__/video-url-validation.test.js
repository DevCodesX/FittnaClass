import { validateVideoUrl } from '../src/lib/validators';

describe('Video URL Validation', () => {
    it('accepts valid local upload paths', () => {
        const result = validateVideoUrl('/uploads/videos/video-1773712698692-710406653.mp4');
        expect(result.success).toBe(true);
    });

    it('accepts valid external HTTP/HTTPS URLs', () => {
        const result = validateVideoUrl('https://example.com/video.mp4');
        expect(result.success).toBe(true);
    });

    it('rejects invalid local paths', () => {
        const result = validateVideoUrl('/documents/videos/test.mp4');
        expect(result.success).toBe(false);
        expect(result.errors.url).toBe('Invalid video URL format. Must be a valid local upload path or external URL.');
    });

    it('rejects empty strings', () => {
        const result = validateVideoUrl('');
        expect(result.success).toBe(false);
        expect(result.errors.url).toMatch(/Video URL is required/);
    });

    it('rejects completely invalid paths', () => {
        const result = validateVideoUrl('not-a-url.mp4');
        expect(result.success).toBe(false);
    });
});
