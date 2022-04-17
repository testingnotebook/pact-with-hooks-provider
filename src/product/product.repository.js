const Product = require('./product')

class ProductRepository {
  constructor() {
    this.products = new Map([
      ['10', new Product('10', 'CREDIT_CARD', '28 Degrees', 'v1')],
    ])
  }

  async fetchAll() {
    return [...this.products.values()]
  }

  async getById(id) {
    return this.products.get(id)
  }
}

module.exports = ProductRepository
