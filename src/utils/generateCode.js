const { nanoid } = require('nanoid');

const generateCode = () => nanoid(7);

module.exports = generateCode;
