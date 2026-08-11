import { apiFetch } from './api'

function headers(token: string | null | undefined): HeadersInit {
  if (!token) throw Object.assign(new Error('Sesión requerida'), { status: 401 })
  return { Authorization: `Bearer ${token}` }
}

export type DashboardSummary = {
  generatedAt: string
  metrics: {
    customers: number
    activeReservations: number
    pendingReservations: number
    confirmedReservations: number
    pendingPaymentOrders: number
    confirmedPayments: number
    collected: Array<{ currency: string; amount: number }>
    activeCustomersRecent: number
	    activeCarts: number
	    convertedCarts: number
	    checkoutStarted: number
	    visitorsRecent: number
	    occupancyRate: number
	    conversionRate: number
	    publishedMapPois: number
	  }
  upcomingSlots: Array<{
    id: string
    experienceTitle: string
    startAt: string
    endAt: string
    capacity: number
    reserved: number
    available: number
    status: string
    operationalStatus: string
    isBookable: boolean
  }>
  recentReservations: Array<{
    id: string
    reservationNumber: string
    status: string
    peopleCount: number
    total: number
    currency: string
    createdAt: string
  }>
  recentOrders: Array<{
    id: string
    orderNumber: string
    status: string
    total: number
    currency: string
    createdAt: string
  }>
  recentAppActivity: Array<{
    id: string
    customerName: string | null
    eventName: string
    module: string
    entityType: string | null
    entityId: string | null
    occurredAt: string
  }>
}

export const dashboardClient = {
  get(token: string | null | undefined) {
    return apiFetch<{ ok: true; data: DashboardSummary }>('/api/admin/dashboard', {
      headers: headers(token),
    })
  },
}
