import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const cartReference = useRef<Product[]>()

  useEffect(() => {
    cartReference.current = cart
  })

  const cartRefValidated = cartReference.current ?? cart

  //update cart
  useEffect(() => {
    if (cartRefValidated !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart))
    }
  }, [cart, cartRefValidated])

  const addProduct = async (productId: number) => {
    try {
      const newCart = [...cart]

      const productExist = newCart.find(product => product.id === productId)

      const stock = await api.get(`/stock/${productId}`)

      const dataStock = stock.data.amount
      const dataProduct = productExist ? productExist.amount : 0;

      const amountResult = dataProduct + 1

      if (amountResult > dataStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExist) {
        productExist.amount = amountResult
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }

        newCart.push(newProduct)
      }

      setCart(newCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const cartUpdated = [...cart]
      const removeCart = cartUpdated.filter(product => product.id === productId)
      const indexCartRemoved = cartUpdated.indexOf(removeCart[0])

      if (indexCartRemoved >= 0) {
        cartUpdated.splice(indexCartRemoved, 1)
        setCart(cartUpdated)
      } else {
        throw Error
      }

    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      if (amount <= 0) {
        return
      }

      const stock = await api.get(`/stock/${productId}`)

      const stockData = stock.data.amount

      if (stockData < amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const cartUpdated = [...cart]
      const productExist = cartUpdated.find(product => product.id === productId) //link productExist and cartUpdated


      if (productExist) {
        productExist.amount = amount
        setCart(cartUpdated)
      } else {
        throw Error
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
