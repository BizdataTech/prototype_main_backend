import sys

files_to_fix = [
    r"c:\Users\dell\bizdata\prototype_main\frontend\app\(client)\checkout\page.jsx",
    r"c:\Users\dell\bizdata\prototype_main\frontend\app\(client)\cart\page.jsx"
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # checkout and cart replacements
    content = content.replace('<span>AED {cart?.cartTotal || 0}</span>', '<span>AED {Number(cart?.cartTotal || 0).toFixed(2)}</span>')
    content = content.replace('<span>{shipping === 0 ? "Complimentary" : `AED ${shipping}`}</span>', '<span>{shipping === 0 ? "Complimentary" : `AED ${Number(shipping).toFixed(2)}`}</span>')
    content = content.replace('<span>AED {tax}</span>', '<span>AED {Number(tax).toFixed(2)}</span>')
    content = content.replace('<span>AED {estimatedTotal}</span>', '<span>AED {Number(estimatedTotal).toFixed(2)}</span>')
    
    # checkout product price
    content = content.replace('AED {Number(prod.price || 0)}\n                          </div>', 'AED {Number(prod.price || 0).toFixed(2)}\n                          </div>')
    
    # cart totals
    content = content.replace('<span>AED {cart.cartTotal}</span>', '<span>AED {Number(cart.cartTotal || 0).toFixed(2)}</span>')

    # cart product price
    content = content.replace('<span className="text-[2rem] font-light text-black">AED {Number(prod.price || 0)}</span>', '<span className="text-[2rem] font-light text-black">AED {Number(prod.price || 0).toFixed(2)}</span>')
    content = content.replace('<div className="text-[1.4rem] text-neutral-400 line-through mt-1">AED {Number(prod.sale_price)}</div>', '<div className="text-[1.4rem] text-neutral-400 line-through mt-1">AED {Number(prod.sale_price).toFixed(2)}</div>')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed prices.")
