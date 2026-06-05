# AutoMarket Admin Panel

## Access

The admin panel is located at `/admin` and is protected by Firebase Authentication.

### Default Admin Credentials

To access the admin dashboard, create a user in Firebase Console with these credentials:

**Email:** `admin@automarket.co.nz`  
**Password:** `AutoMarket2024!`

### Setup Instructions

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select the `automarket-710a5` project
3. Navigate to **Authentication > Users**
4. Click **Add user**
5. Enter:
   - Email: `admin@automarket.co.nz`
   - Password: `AutoMarket2024!`
6. Click **Create user**

You can now log in at `/admin/login`.

## Admin Features

### Dashboard (`/admin`)
- Overview stats: Total Vehicles, Total Sales, Total Revenue, Pending Financing Requests
- Recent Sales table
- Recent Messages preview

### Vehicle Inventory (`/admin/cars`)
- View all cars with filters (Featured Only, On Sale Only)
- Toggle featured status inline
- Edit vehicles
- Delete vehicles

### Add Vehicle (`/admin/cars/add`)
- Complete form for adding new vehicles
- Auto-saves to Firestore 'cars' collection

### Edit Vehicle (`/admin/cars/edit/:id`)
- Edit existing vehicle details
- Delete vehicle with confirmation

### Financing Requests (`/admin/financing`)
- View all financing applications
- Filter by status: Pending, Approved, Rejected, Paying, Completed
- Approve/Reject/Mark as Paying/Complete applications
- Reply via email
- Delete requests

### Messages Inbox (`/admin/messages`)
- View all contact and financing messages
- Filter by type and read status
- Mark messages as read/unread
- Reply via email
- Delete messages

## Firestore Collections

### cars
- Document ID: car.id
- Fields: title, brand, model, year, price, originalPrice, isOnSale, km, transmission, fuel, description, ownerDescription, images[], color, featured

### financing
- Fields: carId, carTitle, firstName, lastName, email, phone, licenseNumber, monthlyIncome, downPayment, loanTerm, monthlyPayment, totalAmount, totalInterest, status, createdAt

### messages
- Fields: senderName, email, phone, reason, message, read, type, createdAt

### sales
- Fields: carId, carTitle, carYear, buyerName, buyerEmail, buyerPhone, salePrice, paymentMethod, saleDate, notes, status, createdAt

## Security Rules

The admin panel requires authentication. Users who are not signed in are redirected to `/admin/login`.

To change admin credentials, update the user in Firebase Console under Authentication > Users.

## Notes

- All times are in New Zealand timezone
- Prices are formatted in NZD (New Zealand Dollar)
- The admin panel does not display Navbar or Footer
- All forms save directly to Firestore with real-time updates
