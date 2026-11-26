# FashionSpeaks Store

An African fashion store with an admin inventory system. Shoppers browse and
add products to a cart. Admins log in to manage products and monitor stock.

**Live site:** [paste your Vercel link here]

## Features

**Admin area**
- Admin registration (with an invite code) and login, using Firebase Authentication
- Dashboard showing total products, total stock, low-stock items and categories
- Retrieve and display products from the DummyJSON API, then add them to the inventory
- Add new products with a form (price, stock, sizes, colours, image link, description)
- View all saved products, and view a single product's full details
- Edit and delete products
- Search by name, filter by category and by stock status
- Quick quantity update (+ / - and Save) straight from the table
- Team page for the owner: create and revoke invite codes, switch admins on or off

**Store front**
- Landing page with rotating campaign words, categories and featured products
- Shop page with search, category filter and sorting
- Product details page with size and colour choices
- Shopping cart saved in the browser

## Built with

HTML, CSS and JavaScript (no framework), Firebase Authentication, Cloud Firestore,
and the DummyJSON API. Hosted on Vercel.

## Project structure

```
index.html, shop.html, product-details.html, about.html, contact.html
style.css, fashion.js
admin/   login, register, dashboard, product (inventory), team pages + admin.css
js/      firebase-config, auth, guard, products, dashboard, api-products,
         shop, details, cart, featured and shared helpers
images/  logo, favicons, category and campaign pictures
```

## How the data is stored

Cloud Firestore has three collections:
- `products`: every product in the store
- `admins`: who may manage the store (role and an on/off switch)
- `inviteCodes`: codes the owner hands out so new admins can register

Security rules (see `firestore.rules`) let anyone read products, but only
active admins can change them, and only the owner can manage codes and admins.

## Run it locally

The pages use JavaScript modules, so they must be served, not double-clicked.
1. Open the folder in VS Code and install the Live Server extension.
2. Click **Go Live**.
3. Open `http://localhost:5500` (or the address Live Server shows).

## Try the admin area

Registration needs an invite code from the owner.
1. Ask the owner for a code, or use the demo code: `[demo code, revoked after review]`
2. Open `/admin/register.html`, fill in the form with the code, and create an account.
3. You land on the dashboard. Open **Products** to add, view, edit, delete and
   update stock, or load products from the API.

## Possible next steps

Checkout and orders, online payment, product image uploads.

## Author

[Your name]. Built as a learning project, 2026.