import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import { unlockUserAccess, addMinutesToUser, sanitizeUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Debes iniciar sesión para realizar el pago.' }, { status: 401 });
    }

    const {
      packageType = 'creator_pass', // 'creator_pass' ($5) | 'pack_15' ($9) | 'pack_60' ($29) | 'pack_180' ($79)
      cardNumber,
      cardExpiry,
      cardCvc,
      cardName,
      paymentMethod = 'card',
    } = await req.json();

    // Validar datos básicos si se proporciona tarjeta
    if (paymentMethod === 'card' && cardNumber) {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 13 || cleanCard.length > 19) {
        return NextResponse.json({ error: 'Número de tarjeta inválido. Debe tener entre 13 y 19 dígitos.' }, { status: 400 });
      }
    }

    if (packageType === 'creator_pass') {
      // Activar Pase de Creador ($3 USD) con 20 minutos incluidos
      const result = unlockUserAccess(user.id, 3.0, paymentMethod);
      if (!result.success || !result.user) {
        return NextResponse.json({ error: result.error || 'Error al procesar el pago' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: '¡Pase Creador Hey Milo activado con éxito! Tienes 20 minutos de video Veo 3.1 incluidos.',
        user: sanitizeUser(result.user),
        receipt: {
          amount: 3.0,
          currency: 'USD',
          plan: 'Pase Creador Hey Milo ($3 USD)',
          date: new Date().toISOString(),
          includedMinutes: 20.0,
        },
      });
    } else if (packageType === 'pack_15' || packageType === 'starter') {
      const result = addMinutesToUser(user.id, 15, 3.0, paymentMethod);
      return NextResponse.json({
        success: true,
        message: '¡Recarga Starter de 15 minutos completada con éxito ($3 USD)!',
        user: sanitizeUser(result.user!),
      });
    } else if (packageType === 'pack_60' || packageType === 'pro') {
      const result = addMinutesToUser(user.id, 60, 6.0, paymentMethod);
      return NextResponse.json({
        success: true,
        message: '¡Recarga Creador Pro de 60 minutos completada con éxito ($6 USD)!',
        user: sanitizeUser(result.user!),
      });
    } else if (packageType === 'pack_180' || packageType === 'studio') {
      const result = addMinutesToUser(user.id, 180, 10.0, paymentMethod);
      return NextResponse.json({
        success: true,
        message: '¡Recarga Estudio Cine de 180 minutos completada con éxito ($10 USD)!',
        user: sanitizeUser(result.user!),
      });
    }

    return NextResponse.json({ error: 'Paquete desconocido' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al procesar el pago' }, { status: 500 });
  }
}
