function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

const menuText = 'Spicy Chicken Sandwich, Individual Cheese Pizza, and Sun Butter & Jelly Sandwich';
const safe = escapeXml(menuText);

console.log('Original:', menuText);
console.log('Escaped:', safe);
console.log('\nSSML Output:');
console.log(`Today's lunch menu includes ${safe}.`);
console.log('\nVerification:');
console.log('Contains &amp;:', safe.includes('&amp;'));
console.log('Contains raw &:', safe.includes('&') && !safe.includes('&amp;'));
