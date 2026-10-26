const fs = require('fs');

const filesToFix = [
    'c:\\Users\\dell\\bizdata\\prototype_main\\frontend\\app\\(client)\\checkout\\page.jsx',
    'c:\\Users\\dell\\bizdata\\prototype_main\\frontend\\app\\(client)\\cart\\page.jsx'
];

for (const filePath of filesToFix) {
    let content = fs.readFileSync(filePath, 'utf8');

    // checkout and cart replacements
    content = content.replace('<span>AED {cart?.cartTotal || 0}</span>', '<span>AED {Number(cart?.cartTotal || 0).toFixed(2)}</span>');
    content = content.replace('<span>{shipping === 0 ? "Complimentary" : `AED ${shipping}`}</span>', '<span>{shipping === 0 ? "Complimentary" : `AED ${Number(shipping).toFixed(2)}`}</span>');
    content = content.replace('<span>AED {tax}</span>', '<span>AED {Number(tax).toFixed(2)}</span>');
    content = content.replace('<span>AED {estimatedTotal}</span>', '<span>AED {Number(estimatedTotal).toFixed(2)}</span>');
    
    // checkout product price
    content = content.replace('AED {Number(prod.price || 0)}\\n                          </div>', 'AED {Number(prod.price || 0).toFixed(2)}\\n                          </div>');
    
    // cart totals
    content = content.replace('<span>AED {cart.cartTotal}</span>', '<span>AED {Number(cart.cartTotal || 0).toFixed(2)}</span>');

    // cart product price
    content = content.replace('<span className="text-[2rem] font-light text-black">AED {Number(prod.price || 0)}</span>', '<span className="text-[2rem] font-light text-black">AED {Number(prod.price || 0).toFixed(2)}</span>');
    content = content.replace('<div className="text-[1.4rem] text-neutral-400 line-through mt-1">AED {Number(prod.sale_price)}</div>', '<div className="text-[1.4rem] text-neutral-400 line-through mt-1">AED {Number(prod.sale_price).toFixed(2)}</div>');

    fs.writeFileSync(filePath, content, 'utf8');
}

console.log("Fixed prices.");
