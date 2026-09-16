import { Router } from 'express';
import { db } from '../db.js';
import { AuthenticatedRequest, requireAuth } from '../auth.js';
import { Address, Product } from '../../src/types.js';

const router = Router();

// GET /api/user/addresses
router.get('/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const addressesCol = db.collection<Address>('addresses');
    const addresses = await addressesCol.find({ userId: req.user!._id }, { sort: { isDefault: -1, createdAt: -1 } });
    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch addresses' });
  }
});

// POST /api/user/addresses - Add new address
router.post('/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { fullName, phone, alternatePhone, pincode, locality, addressLine, city, state, landmark, type, isDefault } = req.body;

    if (!fullName || !phone || !pincode || !addressLine || !city || !state) {
      return res.status(400).json({ success: false, error: 'Full name, phone, PIN code, address line, city, and state are required.' });
    }

    const addressesCol = db.collection<Address>('addresses');

    if (isDefault) {
      // Unset previous defaults
      await addressesCol.updateMany({ userId: req.user!._id }, { $set: { isDefault: false } });
    }

    // Check if this is the first address, make it default automatically
    const existingCount = await addressesCol.countDocuments({ userId: req.user!._id });
    const shouldBeDefault = isDefault || existingCount === 0;

    const newAddress = await addressesCol.insertOne({
      userId: req.user!._id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      alternatePhone: alternatePhone ? alternatePhone.trim() : undefined,
      pincode: pincode.trim(),
      locality: locality ? locality.trim() : '',
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim(),
      landmark: landmark ? landmark.trim() : undefined,
      type: type === 'WORK' ? 'WORK' : 'HOME',
      isDefault: shouldBeDefault,
    });

    res.status(201).json({
      success: true,
      message: 'Address saved successfully.',
      data: newAddress,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to save address' });
  }
});

// PUT /api/user/addresses/:id - Update address
router.put('/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { fullName, phone, alternatePhone, pincode, locality, addressLine, city, state, landmark, type, isDefault } = req.body;
    const addressesCol = db.collection<Address>('addresses');

    const address = await addressesCol.findOne({ _id: id, userId: req.user!._id });
    if (!address) {
      return res.status(404).json({ success: false, error: 'Address not found' });
    }

    if (isDefault) {
      await addressesCol.updateMany({ userId: req.user!._id }, { $set: { isDefault: false } });
    }

    await addressesCol.updateOne(
      { _id: id },
      {
        $set: {
          fullName: fullName ? fullName.trim() : address.fullName,
          phone: phone ? phone.trim() : address.phone,
          alternatePhone: alternatePhone !== undefined ? alternatePhone : address.alternatePhone,
          pincode: pincode ? pincode.trim() : address.pincode,
          locality: locality !== undefined ? locality : address.locality,
          addressLine: addressLine ? addressLine.trim() : address.addressLine,
          city: city ? city.trim() : address.city,
          state: state ? state.trim() : address.state,
          landmark: landmark !== undefined ? landmark : address.landmark,
          type: type || address.type,
          isDefault: isDefault !== undefined ? isDefault : address.isDefault,
        },
      }
    );

    const updated = await addressesCol.findById(id);
    res.json({ success: true, message: 'Address updated.', data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update address' });
  }
});

// DELETE /api/user/addresses/:id - Delete address
router.delete('/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const addressesCol = db.collection<Address>('addresses');
    await addressesCol.deleteOne({ _id: id, userId: req.user!._id });
    res.json({ success: true, message: 'Address deleted.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to delete address' });
  }
});

// GET /api/user/wishlist
router.get('/wishlist', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const wishlistsCol = db.collection('wishlists');
    const wishlist = await wishlistsCol.findOne({ userId: req.user!._id });

    if (!wishlist || !Array.isArray(wishlist.productIds) || wishlist.productIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const productsCol = db.collection<Product>('products');
    const items = await productsCol.find({ _id: { $in: wishlist.productIds } });

    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch wishlist' });
  }
});

// POST /api/user/wishlist/toggle - Add or remove product from wishlist
router.post('/wishlist/toggle', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required.' });
    }

    const wishlistsCol = db.collection('wishlists');
    let wishlist = await wishlistsCol.findOne({ userId: req.user!._id });

    if (!wishlist) {
      wishlist = await wishlistsCol.insertOne({
        userId: req.user!._id,
        productIds: [productId],
      });
      return res.json({ success: true, message: 'Item added to your Wishlist!', inWishlist: true });
    }

    const exists = wishlist.productIds.includes(productId);
    if (exists) {
      await wishlistsCol.updateOne({ _id: wishlist._id }, { $pull: { productIds: productId } });
      return res.json({ success: true, message: 'Item removed from your Wishlist.', inWishlist: false });
    } else {
      await wishlistsCol.updateOne({ _id: wishlist._id }, { $push: { productIds: productId } });
      return res.json({ success: true, message: 'Item saved to your Wishlist!', inWishlist: true });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to update wishlist' });
  }
});

// GET /api/user/notifications
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res) => {
  const notificationsCol = db.collection('notifications');
  const items = await notificationsCol.find(
    { $or: [{ userId: req.user!._id }, { userId: 'ALL' }] },
    { sort: { createdAt: -1 }, limit: 20 }
  );
  res.json({ success: true, data: items });
});

export default router;
