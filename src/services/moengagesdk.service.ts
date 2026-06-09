// MoEngage SDK Service — equivalent to Angular MoengagesdkService
// Handles analytics event tracking and user attribute management

class MoengagesdkService {
  private getMoe() {
    return typeof window !== 'undefined' ? (window as any).Moengage : null;
  }

  async MoeInit(): Promise<void> {
    try {
      const Moengage = await import('@moengage/web-sdk');
      await Moengage.initialize({
        app_id: '8Q5GNFTMC64B07VZ67XUTJWY', // PreProd App ID
        // app_id: '8TWYM2SJLK8VXYIOOM07NYJB', // PROD
        debug_logs: 0,
        cluster: 'dc_3',
        swPath: '/diy/moe_sw.js',
      });
      console.log('MoEngage SDK initialized');
    } catch (error) {
      console.error('MoEngage initialization failed', error);
    }
  }

  async trackEvent(eventName: string, payload: any = {}): Promise<void> {
    try {
      const Moengage = await import('@moengage/web-sdk');
      await Moengage.track_event(eventName, payload);
      console.log('[MoEngage] Event Tracked:', eventName, payload);
    } catch (error) {
      console.error('[MoEngage] Track event error:', error);
    }
  }

  async setUserAttributes(
    userId: string,
    mobile: string,
    email: string,
    firstName: string,
    lastName: string
  ): Promise<void> {
    try {
      const Moengage = await import('@moengage/web-sdk');
      await Moengage.add_unique_user_id(userId);
      await Moengage.add_mobile(mobile);
      await Moengage.add_email(email);
      await Moengage.add_first_name(firstName);
      await Moengage.add_last_name(lastName);
      await Moengage.call_web_push();
      console.log('MoEngage User Attributes Set:', userId, mobile, email, firstName, lastName);
    } catch (error) {
      console.error('[MoEngage] Set user attributes error:', error);
    }
  }

  async logoutUser(): Promise<void> {
    try {
      const Moengage = await import('@moengage/web-sdk');
      await Moengage.destroy_session();
      console.log('MoEngage session destroyed on logout');
    } catch (error) {
      console.error('[MoEngage] Logout error:', error);
    }
  }
}

export const moengagesdkService = new MoengagesdkService();
export default moengagesdkService;
