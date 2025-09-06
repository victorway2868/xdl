import React from 'react';
import { Crown, ExternalLink, MessageCircle, CreditCard } from 'lucide-react';
import '../styles/themes.css';
import { ThemeCard, ThemeButton, ThemeText } from '../components/common/ThemeComponents';

const openUrl = (url: string) => {
  try {
    window.electronAPI?.openExternal?.(url);
  } catch (e) {
    console.warn('openExternal not available, fallback window.open');
    window.open(url, '_blank');
  }
};

const MembershipPage: React.FC = () => {
  const officialSite = 'https://xiaodouli.openclouds.dpdns.org';
  const rechargeUrl = 'https://xiaodouli.openclouds.dpdns.org/#/pricing';
  const qqGroupUrl = 'https://qm.qq.com/cgi-bin/qm/qr?k=WkSEvbmnenRe_sgwE_mti_Z1wtmBWb3E&jump_from=webapi&authKey=lKoLlcTJ9C0qX/5THp+m73Pbxv8Qvhwian42SC7Z3ZZmUWaqDAanCjBM9UauQ6IX';

  const [state, setState] = React.useState<any>(null);
  const [showWeixin, setShowWeixin] = React.useState(false);
  const [showQQ, setShowQQ] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      try {
        const s = await window.electronAPI.getAuthingStatus();
        setState(s);
      } catch {}
    })();
    const off = window.electronAPI.onAuthingUpdated?.((payload) => setState(payload));
    return () => { try { off && off(); } catch {} };
  }, []);

  const loggedIn = !!state?.loggedIn;
  const user = state?.user;
  const isMember = !!state?.isMember;
  const expiryTextCN = state?.expiryTextCN || '未开通';

  const handleLogin = async () => {
    try {
      await window.electronAPI.startAuthingLogin();
    } catch (e) {
      console.error('登录失败', e);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.logoutAuthing();
    } catch {}
  };

  return (
    <div className="theme-page p-4 md:p-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Crown size={18} className="text-amber-400" />
          <h2 className="m-0 text-lg font-semibold">会员中心</h2>
        </div>
      </div>

      {/* 账号信息 */}
      <ThemeCard className="p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-500/20">
            <img src="icons/icon-256x256.png" alt="账户头像" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="text-sm text-slate-500">账号</div>
            <div className="text-base font-medium">
              {loggedIn ? (
                <ThemeText>{user?.email || '未知'}</ThemeText>
              ) : (
                <ThemeText variant="muted">未登录</ThemeText>
              )}
            </div>
          </div>
          <div className="ml-auto">
            {!loggedIn ? (
              <ThemeButton variant="primary" onClick={handleLogin}>登录</ThemeButton>
            ) : (
              <ThemeButton variant="secondary" onClick={handleLogout}>退出登录</ThemeButton>
            )}
          </div>
        </div>
      </ThemeCard>

      {/* 会员状态与充值 */}
      <ThemeCard className="p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-slate-500">会员期</div>
            <div className="text-base font-medium">{isMember ? (expiryTextCN || '已开通') : '未开通'}</div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeButton
              variant="primary"
              className="flex items-center gap-1"
              onClick={() => openUrl(rechargeUrl)}
              title="前往充值/购买"
            >
              <CreditCard size={16} />
              充值
            </ThemeButton>
          </div>
        </div>
      </ThemeCard>

      {/* 软件官方访问、客服联系 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ThemeCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">软件官方访问</div>
              <div className="text-base font-medium">官网/文档</div>
            </div>
            <ThemeButton
              variant="secondary"
              className="flex items-center gap-1"
              onClick={() => openUrl(officialSite)}
              title="打开官网"
            >
              <ExternalLink size={16} />
              打开
            </ThemeButton>
          </div>
        </ThemeCard>

        <ThemeCard className="p-4">
          <div className="flex flex-col gap-3">
            {/* 微信客服 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">微信客服(9:00~22:00)</div>
              </div>
              <ThemeButton
                variant="secondary"
                className="flex items-center gap-1"
                onClick={() => setShowWeixin(true)}
                title="联系微信客服"
              >
                <MessageCircle size={16} />
                联系
              </ThemeButton>
            </div>

            {/* QQ群 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-500">QQ群：671868886</div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeButton
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => openUrl(qqGroupUrl)}
                  title="前往加群"
                >
                  <ExternalLink size={16} />
                  加群
                </ThemeButton>
                <ThemeButton
                  variant="secondary"
                  className="flex items-center gap-1"
                  onClick={() => setShowQQ(true)}
                  title="查看QQ群二维码"
                >
                  二维码
                </ThemeButton>
              </div>
            </div>
          </div>

      {/* 微信客服弹窗 */}
      {showWeixin && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center" onClick={() => setShowWeixin(false)}>
          <div className="theme-card rounded-xl p-4 w-full max-w-[540px] mx-4" onClick={(e) => e.stopPropagation()}>
            <img src="images/weixin.png" alt="微信客服二维码" className="w-full h-auto block rounded-lg" />
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowWeixin(false)} className="btn-base btn-ghost px-4 py-1.5">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* QQ群二维码弹窗 */}
      {showQQ && (
        <div className="fixed inset-0 theme-modal-overlay z-50 flex items-center justify-center" onClick={() => setShowQQ(false)}>
          <div className="theme-card rounded-xl p-4 w-full max-w-[540px] mx-4" onClick={(e) => e.stopPropagation()}>
            <img src="images/qqunrcode-567.png" alt="QQ群二维码" className="w-full h-auto block rounded-lg" />
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowQQ(false)} className="btn-base btn-ghost px-4 py-1.5">关闭</button>
            </div>
          </div>
        </div>
      )}

        </ThemeCard>
      </div>
    </div>
  );
};

export default MembershipPage;

