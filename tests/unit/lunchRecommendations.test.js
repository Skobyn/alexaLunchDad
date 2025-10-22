const { getLunchRecommendation, lunchOptions } = require('../../src/utils/lunchRecommendations');

describe('Lunch Recommendations', () => {
    describe('getLunchRecommendation', () => {
        it('should return a string', () => {
            const recommendation = getLunchRecommendation();
            expect(typeof recommendation).toBe('string');
        });

        it('should return one of the predefined options', () => {
            const recommendation = getLunchRecommendation();
            expect(lunchOptions).toContain(recommendation);
        });

        it('should return different recommendations over multiple calls', () => {
            const recommendations = new Set();
            // Call 50 times to increase chance of getting different values
            for (let i = 0; i < 50; i++) {
                recommendations.add(getLunchRecommendation());
            }
            // Should get at least 2 different recommendations
            expect(recommendations.size).toBeGreaterThan(1);
        });
    });

    describe('lunchOptions', () => {
        it('should have at least 5 options', () => {
            expect(lunchOptions.length).toBeGreaterThanOrEqual(5);
        });

        it('should contain only strings', () => {
            lunchOptions.forEach(option => {
                expect(typeof option).toBe('string');
            });
        });
    });
});
