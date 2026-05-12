const jwt = require('jsonwebtoken');

const secret = 'your_super_secret_key_change_this_in_production';
const payload = {
  id: 'e18ecc73-96d5-4c17-ac4d-5d984a196d82', // ID for janipashajani96@gmail.com
  email: 'janipashajani96@gmail.com',
  role: 'admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '30d' });
console.log('Admin Access Token:');
console.log(token);
