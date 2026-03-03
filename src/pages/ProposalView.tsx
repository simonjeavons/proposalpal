import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Proposal, Challenge, Phase, RetainerOption, UpfrontItem } from "@/types/proposal";
import { DEFAULT_LAUNCH_PHASE } from "@/types/proposal";

const ShootHillMark = () => (
  <svg className="absolute -right-[120px] -bottom-[120px] w-[560px] h-[560px] opacity-10 pointer-events-none z-0" viewBox="0 0 199 198" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M107.317 42.1395C119.651 43.8757 131.089 49.5633 139.918 58.3493C148.746 67.1353 154.488 78.5464 156.284 90.8715C156.312 91.0727 156.413 91.2568 156.566 91.39C156.72 91.5232 156.916 91.5965 157.119 91.5965H170.901C171.019 91.5964 171.137 91.5712 171.245 91.5227C171.353 91.4742 171.45 91.4035 171.529 91.3151C171.608 91.226 171.668 91.1214 171.704 91.0081C171.74 90.8947 171.752 90.775 171.739 90.6568C167.924 57.2748 140.919 30.3714 107.525 26.6866C107.407 26.6737 107.288 26.6857 107.174 26.7219C107.061 26.758 106.956 26.8175 106.867 26.8964C106.779 26.9755 106.708 27.0723 106.66 27.1805C106.612 27.2886 106.587 27.4058 106.587 27.5243V41.3043C106.587 41.508 106.661 41.7047 106.795 41.8583C106.929 42.0118 107.114 42.1117 107.316 42.1395" fill="white"/>
    <path d="M91.3911 26.6858C57.9976 30.3707 30.9914 57.2741 27.1757 90.6576C27.1624 90.776 27.1742 90.8957 27.2104 91.0092C27.2466 91.1226 27.3062 91.2271 27.3855 91.316C27.4643 91.4047 27.5609 91.4757 27.6692 91.5242C27.7774 91.5727 27.8948 91.5976 28.0134 91.5974H41.7959C41.999 91.5972 42.1953 91.5238 42.3487 91.3907C42.5021 91.2575 42.6024 91.0735 42.6311 90.8724C44.4274 78.5473 50.1702 67.1365 58.9987 58.3506C67.8272 49.5647 79.2656 43.877 91.5993 42.1404C91.802 42.1134 91.9879 42.0134 92.1223 41.8592C92.2566 41.705 92.3302 41.5072 92.3292 41.3027V27.5243C92.3292 27.4059 92.3044 27.2888 92.2562 27.1806C92.2079 27.0724 92.1375 26.9756 92.0494 26.8965C91.961 26.8165 91.8565 26.7564 91.743 26.7202C91.6294 26.684 91.5094 26.6717 91.3911 26.6858Z" fill="white"/>
    <path d="M171.596 106.139C171.517 106.051 171.42 105.981 171.312 105.933C171.204 105.884 171.087 105.859 170.969 105.86H157.188C156.983 105.86 156.785 105.934 156.631 106.069C156.477 106.204 156.378 106.39 156.351 106.593C154.675 119.031 148.975 130.58 140.121 139.476C131.267 148.372 119.746 154.127 107.316 155.863C107.114 155.891 106.93 155.991 106.796 156.144C106.663 156.298 106.589 156.495 106.589 156.698V170.478C106.589 170.589 106.611 170.699 106.653 170.802C106.696 170.904 106.758 170.997 106.836 171.076C106.915 171.154 107.008 171.216 107.111 171.258C107.214 171.301 107.323 171.322 107.434 171.322C107.465 171.322 107.495 171.32 107.526 171.317C123.961 169.423 139.268 162.01 150.945 150.29C162.622 138.569 169.977 123.234 171.81 106.792C171.822 106.675 171.809 106.556 171.773 106.444C171.736 106.331 171.677 106.228 171.598 106.14" fill="white"/>
    <path d="M91.5986 155.863C79.168 154.127 67.6466 148.372 58.7927 139.476C49.9388 130.58 44.2387 119.031 42.5621 106.593C42.5353 106.39 42.4357 106.203 42.2817 106.069C42.1277 105.934 41.9299 105.859 41.7252 105.86H27.946C27.8276 105.859 27.7105 105.884 27.6023 105.932C27.4942 105.98 27.3973 106.051 27.3182 106.139C27.2391 106.227 27.1794 106.331 27.1431 106.443C27.1068 106.556 27.0947 106.675 27.1075 106.793C28.9392 123.235 36.2945 138.57 47.9711 150.29C59.6477 162.01 74.9549 169.423 91.3904 171.316C91.4213 171.319 91.4523 171.321 91.4834 171.321C91.5942 171.321 91.704 171.299 91.8064 171.257C91.9088 171.215 92.0019 171.153 92.0803 171.074C92.1586 170.996 92.2208 170.903 92.2631 170.8C92.3054 170.698 92.3271 170.588 92.3268 170.477V156.697C92.3268 156.494 92.253 156.297 92.1191 156.143C91.9853 155.99 91.8004 155.89 91.5986 155.862" fill="white"/>
    <path d="M107.435 131.625C107.503 131.625 107.572 131.617 107.638 131.6C113.614 130.126 119.074 127.045 123.427 122.693C127.779 118.34 130.859 112.881 132.334 106.905C132.364 106.78 132.366 106.65 132.339 106.525C132.312 106.4 132.257 106.282 132.177 106.181C132.098 106.08 131.997 105.999 131.881 105.943C131.766 105.888 131.639 105.859 131.511 105.86H119.589C119.42 105.86 119.255 105.91 119.115 106.005C118.975 106.1 118.867 106.234 118.804 106.391C117.75 109.029 116.171 111.426 114.162 113.434C112.153 115.443 109.757 117.022 107.119 118.076C106.962 118.139 106.828 118.247 106.733 118.387C106.638 118.527 106.587 118.692 106.587 118.861V130.785C106.589 131.008 106.679 131.222 106.838 131.38C106.997 131.537 107.211 131.625 107.435 131.625Z" fill="white"/>
    <path d="M107.121 79.38C109.759 80.4343 112.155 82.0138 114.163 84.0225C116.172 86.0312 117.752 88.4271 118.806 91.0649C118.868 91.222 118.977 91.3567 119.117 91.4515C119.257 91.5463 119.422 91.5968 119.591 91.5965H131.515C131.643 91.5968 131.769 91.5679 131.884 91.512C131.999 91.4561 132.1 91.3747 132.179 91.2739C132.258 91.1731 132.313 91.0556 132.339 90.9304C132.366 90.8052 132.364 90.6756 132.332 90.5515C130.859 84.5744 127.778 79.1141 123.425 74.7612C119.072 70.4083 113.612 67.3285 107.634 65.8551C107.51 65.8248 107.381 65.8231 107.256 65.8501C107.131 65.877 107.014 65.9319 106.914 66.0107C106.813 66.0894 106.732 66.1899 106.675 66.3046C106.619 66.4193 106.59 66.5453 106.589 66.673V78.5958C106.589 78.7648 106.64 78.9301 106.734 79.07C106.829 79.21 106.964 79.3175 107.121 79.38Z" fill="white"/>
    <path d="M91.7937 118.074C89.1556 117.02 86.7593 115.441 84.7506 113.432C82.7419 111.423 81.1626 109.027 80.1088 106.389C80.0463 106.232 79.938 106.097 79.798 106.002C79.658 105.907 79.4928 105.857 79.3237 105.857H67.4034C67.2756 105.857 67.1495 105.886 67.0346 105.942C66.9197 105.999 66.8191 106.08 66.7403 106.181C66.6615 106.281 66.6066 106.399 66.5798 106.524C66.553 106.649 66.5549 106.778 66.5855 106.902C68.059 112.879 71.1388 118.339 75.4915 122.692C79.8443 127.044 85.3043 130.124 91.2811 131.598C91.347 131.614 91.4147 131.623 91.4827 131.622C91.7061 131.622 91.9201 131.532 92.0781 131.374C92.2361 131.216 92.3253 131.002 92.3261 130.779V118.855C92.3264 118.686 92.2759 118.521 92.1811 118.381C92.0863 118.241 91.9516 118.133 91.7945 118.07" fill="white"/>
    <path d="M91.28 65.8534C85.3038 67.328 79.8443 70.4081 75.4918 74.7607C71.1392 79.1133 68.0591 84.5728 66.5845 90.549C66.5539 90.6732 66.552 90.8027 66.5788 90.9278C66.6057 91.0528 66.6605 91.1702 66.7393 91.271C66.818 91.3717 66.9186 91.4533 67.0335 91.5096C67.1484 91.5658 67.2745 91.5953 67.4024 91.5957H79.326C79.4949 91.5954 79.6599 91.5444 79.7996 91.4493C79.9392 91.3543 80.0471 91.2195 80.1094 91.0625C81.1631 88.4243 82.7424 86.028 84.7511 84.0192C86.7599 82.0105 89.1562 80.4312 91.7943 79.3775C91.9514 79.3153 92.0862 79.2073 92.1812 79.0677C92.2763 78.928 92.3273 78.7631 92.3276 78.5941V66.6713C92.327 66.5435 92.2974 66.4174 92.2411 66.3027C92.1848 66.1879 92.1033 66.0873 92.0025 66.0086C91.9018 65.9299 91.7845 65.875 91.6595 65.8481C91.5345 65.8213 91.4042 65.8231 91.28 65.8534Z" fill="white"/>
    <path d="M102.462 177.587H96.4554C96.3463 177.587 96.2416 177.63 96.1645 177.708C96.0873 177.785 96.0439 177.889 96.0439 177.999V194.635C96.0579 195.532 96.4241 196.388 97.0635 197.018C97.703 197.647 98.5644 198 99.4618 198C100.359 198 101.221 197.647 101.86 197.018C102.499 196.388 102.866 195.532 102.88 194.635V178C102.88 177.891 102.836 177.786 102.759 177.709C102.682 177.632 102.577 177.589 102.468 177.589" fill="white"/>
    <path d="M20.5182 102.005V95.9981C20.5182 95.889 20.4748 95.7843 20.3977 95.7072C20.3205 95.63 20.2158 95.5867 20.1067 95.5867H3.4713C3.018 95.5796 2.56782 95.6628 2.14699 95.8314C1.72615 96 1.34306 96.2507 1.02001 96.5688C0.696961 96.8868 0.440414 97.266 0.265299 97.6842C0.0901837 98.1023 0 98.5512 0 99.0045C0 99.4579 0.0901837 99.9067 0.265299 100.325C0.440414 100.743 0.696961 101.122 1.02001 101.44C1.34306 101.758 1.72615 102.009 2.14699 102.178C2.56782 102.346 3.018 102.429 3.4713 102.422H20.1051C20.2142 102.422 20.3189 102.379 20.396 102.302C20.4732 102.225 20.5165 102.12 20.5165 102.011" fill="white"/>
    <path d="M177.69 102.005V95.9981C177.69 95.889 177.734 95.7843 177.811 95.7072C177.888 95.63 177.993 95.5867 178.102 95.5867H194.738C195.635 95.6006 196.491 95.9668 197.121 96.6063C197.75 97.2457 198.103 98.1071 198.103 99.0045C198.103 99.9019 197.75 100.763 197.121 101.403C196.491 102.042 195.635 102.408 194.738 102.422H178.104C177.994 102.422 177.89 102.379 177.813 102.302C177.735 102.225 177.692 102.12 177.692 102.011" fill="white"/>
    <path d="M96.4519 20.4129H102.459C102.568 20.4129 102.673 20.3696 102.75 20.2924C102.827 20.2153 102.87 20.1106 102.87 20.0015V3.36523C102.856 2.46794 102.49 1.61212 101.851 0.982505C101.211 0.352894 100.35 0 99.4525 0C98.5551 0 97.6937 0.352894 97.0543 0.982505C96.4148 1.61212 96.0486 2.46794 96.0347 3.36523V20.0015C96.0347 20.1106 96.078 20.2153 96.1552 20.2924C96.2323 20.3696 96.337 20.4129 96.4461 20.4129" fill="white"/>
  </svg>
);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function ProposalView() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStandard, setSelectedStandard] = useState(0);
  const [checkedExtras, setCheckedExtras] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchProposal = async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("slug", slug)
        .single();

      if (!error && data) {
        setProposal({
          ...data,
          challenges: (data.challenges || []) as unknown as Challenge[],
          phases: (data.phases || []) as unknown as Phase[],
          retainer_options: (data.retainer_options || []) as unknown as RetainerOption[],
          launch_phase: ((data as any).launch_phase || { ...DEFAULT_LAUNCH_PHASE }),
        } as Proposal);
        const opts = ((data.retainer_options || []) as RetainerOption[]);
        const standards = opts.filter(r => r.option_type === 'standard');
        const defaultStdIdx = standards.findIndex(r => r.recommended);
        setSelectedStandard(defaultStdIdx >= 0 ? defaultStdIdx : 0);
        const extras = opts.filter(r => r.option_type === 'optional_extra');
        setCheckedExtras(new Set(extras.reduce<number[]>((acc, r, i) => r.recommended ? [...acc, i] : acc, [])));
      }
      setLoading(false);
    };
    fetchProposal();
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F4F7FA' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#009FE3', borderTopColor: 'transparent' }} />
        <p style={{ color: '#AAAAAA', fontSize: 13, fontWeight: 500 }}>Loading proposal…</p>
      </div>
    </div>
  );

  if (!proposal) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F4F7FA' }}>
      <p style={{ color: '#3A6278', fontSize: 16 }}>Proposal not found.</p>
    </div>
  );

  const standardOptions = proposal.retainer_options.filter(r => r.option_type === 'standard');
  const optionalExtras = proposal.retainer_options.filter(r => r.option_type === 'optional_extra');
  const selectedStandardOption = standardOptions[selectedStandard] || null;
  const optionTotal = (r: { price: number; quantity?: number }) => (r.quantity ?? 1) * r.price;
  const extrasTotal = [...checkedExtras].reduce((sum, i) => sum + optionTotal(optionalExtras[i] ?? { price: 0 }), 0);
  const monthlyTotal = (selectedStandardOption ? optionTotal(selectedStandardOption) : 0) + extrasTotal;
  const firstYearTotal = Number(proposal.upfront_total) + (monthlyTotal * 12);

  return (
    <div style={{ background: '#F4F7FA', color: '#1A2E3B', fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.7 }}>
      {/* COVER */}
      <div style={{ background: '#043D5D', minHeight: 360, position: 'relative', overflow: 'hidden', animation: 'fadeUp .6s ease both' }}>
        <div style={{ padding: '52px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32, position: 'relative', zIndex: 1, minHeight: 360 }}>
          <div>
            <img style={{ height: 32, filter: 'brightness(0) invert(1)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', letterSpacing: '.06em', marginTop: 6 }}>Award-winning, full-service digital technology experts</div>
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, color: 'white', letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 10 }}>{proposal.client_name}</h1>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#009FE3', marginBottom: 28 }}>{proposal.programme_title}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.4)' }}>
              <strong style={{ display: 'block', color: 'rgba(255,255,255,.7)', fontSize: 13, marginBottom: 2 }}>Prepared by {proposal.prepared_by}</strong>
              {formatDate(proposal.proposal_date)} &nbsp;·&nbsp; Classification: Customer &nbsp;·&nbsp; Valid until {formatDate(proposal.valid_until)}
            </div>
          </div>
        </div>
        <ShootHillMark />
      </div>

      {/* TOPBAR */}
      <nav style={{ background: '#043D5D', padding: '0 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 200, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <img style={{ height: 24, padding: '13px 0', display: 'block', filter: 'brightness(0) invert(1)' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
        <div style={{ display: 'flex', overflowX: 'auto' }}>
          {['About', 'Challenge', 'Journey', 'Pricing', 'Team', 'Clients', 'Contact'].map(link => (
            <a key={link} href={`#${link.toLowerCase()}`} style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.5)', textDecoration: 'none', padding: '15px 14px', borderBottom: '2px solid transparent', transition: 'color .2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = 'white'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = 'rgba(255,255,255,.5)'; }}
            >{link}</a>
          ))}
        </div>
      </nav>

      {/* ABOUT */}
      <section id="about" style={{ background: 'white', borderBottom: '1px solid #DDE8EE' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: '#009FE3', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ width: 24, height: 2, background: '#009FE3', display: 'block' }} />About Shoothill
            </div>
            <h2 style={{ fontSize: 'clamp(20px, 2.6vw, 30px)', fontWeight: 800, color: '#043D5D', letterSpacing: '-.025em', lineHeight: 1.2, marginBottom: 14 }}>Shoothill build smart digital solutions that help businesses grow, adapt &amp; stay ahead.</h2>
            <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.75, marginBottom: 10 }}>Working across industries, combining technical expertise with creative thinking to solve real-world problems, whether delivering custom software, managing IT systems, running digital campaigns, or helping businesses become truly AI-native.</p>
            <p style={{ fontSize: 14, color: '#3A6278', lineHeight: 1.75, marginBottom: 10 }}>Our team brings together developers, designers, consultants and specialists who all share one goal: to make things work better for our clients. Flexible, collaborative, easy to work with and always focused on getting results.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 20 }}>
              {['Straight talking', 'Customer first', 'Trusted experts', 'Flexible'].map(v => (
                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700, color: '#043D5D' }}>
                  <span style={{ width: 3, height: 18, background: '#009FE3', flexShrink: 0 }} />{v}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: '#DDE8EE' }}>
            {[
              { num: '2006', text: 'Founded, growing from a two-person startup to 25+ experts' },
              { num: '500+', text: 'Projects delivered with honesty & expertise' },
              { num: '4', text: 'UK offices: Shrewsbury, Telford, Chester and London' },
              { num: '100+', text: 'Years combined technical experience' },
            ].map(s => (
              <div key={s.num} style={{ background: '#043D5D', padding: '28px 22px' }}>
                <strong style={{ display: 'block', fontSize: 36, fontWeight: 800, color: '#009FE3', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 4 }}>{s.num}</strong>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', fontWeight: 500, lineHeight: 1.4 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIMON QUOTE */}
      <section style={{ background: '#F4F7FA', borderBottom: '1px solid #DDE8EE' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '56px 48px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 80, fontWeight: 900, color: '#009FE3', opacity: .2, lineHeight: .8, marginBottom: 6, fontFamily: 'Georgia, serif' }}>"</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', lineHeight: 1.55, letterSpacing: '-.01em', marginBottom: 20 }}>
              I'm proud to lead Shoothill, an established full-service digital provider, working across the UK and beyond. Our clients value having us as a single trusted partner. It's more efficient, more cost-effective and avoids the complications that come with managing multiple suppliers. We've delivered over 500 successful projects, won international awards, and built a reputation for straight-talking, effective work.
            </div>
            <div><strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#043D5D' }}>Simon Jeavons</strong><span style={{ fontSize: 11, color: '#AAAAAA' }}>Group Managing Director</span></div>
          </div>
          <div style={{ background: '#043D5D', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <img style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top' }} src="https://shoothill.com/wp-content/uploads/2024/10/simon-bg.jpg" alt="Simon Jeavons" />
            <div><div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Simon Jeavons</div><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#009FE3' }}>Group Managing Director</div></div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.65 }}>Fellow of the Institute of Consulting with over 25 years' experience in commercial operations, IT and software systems. Promotes innovation and operational excellence across the Shoothill group.</div>
          </div>
        </div>
      </section>

      {/* YOUR BUSINESS AND OUR PARTNERSHIP */}
      {(proposal as any).partnership_overview && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
          <div style={{ background: 'white', border: '1px solid #DDE8EE', margin: '28px 0' }}>
            <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid #DDE8EE' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: '#009FE3', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ width: 24, height: 2, background: '#009FE3', display: 'block' }} />Your Business &amp; Our Partnership
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>How we work together</h2>
            </div>
            <div style={{ padding: '28px 32px' }}>
              {((proposal as any).partnership_overview as string).split('\n').filter(Boolean).map((para: string, i: number) => (
                <p key={i} style={{ color: '#3A6278', fontSize: 14, lineHeight: 1.75, marginBottom: 12 }}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CLIENT CHALLENGE */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        <div id="challenge" style={{ background: 'white', border: '1px solid #DDE8EE', margin: '28px 0' }}>
          <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase' as const }}>01</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Understanding {proposal.client_name}</h2>
          </div>
          <div style={{ padding: '28px 32px' }}>
            {(() => {
              const clientFields = [
                { label: 'Organisation', value: proposal.organisation },
                { label: 'Sector', value: proposal.sector },
                { label: 'Staff', value: proposal.staff },
                { label: 'Current tech stack', value: proposal.tech_stack },
              ].filter(s => s.value && s.value.trim() !== '');
              return clientFields.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 22 }}>
                  {clientFields.map(s => (
                    <div key={s.label} style={{ background: '#F4F7FA', border: '1px solid #DDE8EE', padding: '16px 20px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#043D5D' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
            {proposal.challenge_intro && <p style={{ color: '#3A6278', marginBottom: 18 }}>{proposal.challenge_intro}</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {proposal.challenges.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', borderLeft: '3px solid #DDE8EE', background: '#F4F7FA' }}>
                  <div style={{ width: 10, height: 10, background: '#009FE3', flexShrink: 0, borderRadius: '50%', marginTop: 6 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#043D5D', marginBottom: 1 }}>{c.title}</strong>
                    <span style={{ fontSize: 12, color: '#AAAAAA' }}>{c.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MARKETING SERVICES — additional narrative sections */}
      {proposal.sector?.toLowerCase().includes('marketing') && (() => {
        const marketingSections = [
          { key: 'commercial_opportunity', label: 'Commercial Opportunity' },
          { key: 'strategic_focus',        label: 'Strategic Focus' },
          { key: 'whats_needed',           label: "What's Needed?" },
          { key: 'working_together',       label: 'Working Together' },
        ].filter(s => (proposal as any)[s.key]?.trim());
        if (marketingSections.length === 0) return null;
        return (
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              {marketingSections.map(({ key, label }) => (
                <div key={key} style={{ background: 'white', border: '1px solid #DDE8EE' }}>
                  <div style={{ padding: '16px 32px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 3, height: 18, background: '#009FE3', display: 'block', flexShrink: 0 }} />
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>{label}</h3>
                  </div>
                  <div style={{ padding: '20px 32px' }}>
                    {((proposal as any)[key] as string).split('\n').filter(Boolean).map((para: string, i: number) => (
                      <p key={i} style={{ color: '#3A6278', fontSize: 14, lineHeight: 1.75, marginBottom: 10 }}>{para}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* JOURNEY */}
      <section id="journey" style={{ background: '#043D5D', padding: '60px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 32px)', fontWeight: 800, color: 'white', letterSpacing: '-.025em', marginBottom: 8 }}>Your Transformation Journey</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', maxWidth: 540 }}>A structured, transparent programme. Each phase builds on the last, with clear deliverables and sign-off before the next begins.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(proposal.phases.length, 4)}, 1fr)`, gap: 0, position: 'relative' }}>
            {/* Rail */}
            <div style={{ gridColumn: '1 / -1', gridRow: 2, alignSelf: 'center', height: 4, background: 'linear-gradient(90deg, #009FE3, rgba(0,159,227,.45))', zIndex: 0, pointerEvents: 'none' as const }} />
            {proposal.phases.map((phase, i) => {
              const isAbove = i % 2 === 0;
              return (
                <div key={i} style={{ display: 'contents' }}>
                  {/* Card slot above */}
                  {isAbove ? (
                    <div style={{ gridRow: 1, gridColumn: i + 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1 }}>
                      <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', padding: '18px 16px', width: '90%' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#009FE3', marginBottom: 5 }}>{phase.label}</div>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 5, lineHeight: 1.3 }}>{phase.title}</h3>
                        <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, background: '#009FE3', color: 'white', padding: '2px 8px', marginBottom: 10 }}>{phase.duration}</div>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3, padding: 0, margin: 0 }}>
                          {phase.tasks.map((t, j) => (
                            <li key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', display: 'flex', gap: 6 }}>
                              <span style={{ color: '#009FE3', flexShrink: 0, fontWeight: 700 }}>›</span>{t}
                            </li>
                          ))}
                        </ul>
                        {phase.price ? <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, fontWeight: 800, color: '#009FE3' }}>{phase.price.startsWith('£') ? phase.price : `£${Number(phase.price).toLocaleString('en-GB')}`}</div> : null}
                      </div>
                      <div style={{ width: 2, height: 36, background: 'rgba(0,159,227,.5)', flexShrink: 0 }} />
                    </div>
                  ) : (
                    <div style={{ gridRow: 1, gridColumn: i + 1, zIndex: 1 }} />
                  )}
                  {/* Node */}
                  <div style={{ gridRow: 2, gridColumn: i + 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', border: '4px solid #009FE3', boxShadow: '0 0 0 5px rgba(0,159,227,.2)' }} />
                  </div>
                  {/* Card slot below */}
                  {!isAbove ? (
                    <div style={{ gridRow: 3, gridColumn: i + 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', zIndex: 1 }}>
                      <div style={{ width: 2, height: 36, background: 'rgba(0,159,227,.5)', flexShrink: 0 }} />
                      <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', padding: '18px 16px', width: '90%' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: '#009FE3', marginBottom: 5 }}>{phase.label}</div>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 5, lineHeight: 1.3 }}>{phase.title}</h3>
                        <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, background: '#009FE3', color: 'white', padding: '2px 8px', marginBottom: 10 }}>{phase.duration}</div>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 3, padding: 0, margin: 0 }}>
                          {phase.tasks.map((t, j) => (
                            <li key={j} style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', display: 'flex', gap: 6 }}>
                              <span style={{ color: '#009FE3', flexShrink: 0, fontWeight: 700 }}>›</span>{t}
                            </li>
                          ))}
                        </ul>
                        {phase.price ? <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 12, fontWeight: 800, color: '#009FE3' }}>{phase.price.startsWith('£') ? phase.price : `£${Number(phase.price).toLocaleString('en-GB')}`}</div> : null}
                      </div>
                    </div>
                  ) : (
                    <div style={{ gridRow: 3, gridColumn: i + 1, zIndex: 1 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        <div id="pricing" style={{ background: 'white', border: '1px solid #DDE8EE', margin: '28px 0' }}>
          <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase' as const }}>02</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Investment &amp; Pricing</h2>
          </div>
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {/* Upfront */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#043D5D', letterSpacing: '.04em', textTransform: 'uppercase' as const, paddingBottom: 8, borderBottom: '2px solid #043D5D', marginBottom: 16 }}>Part 1: One-time project delivery</div>
                {/* Upfront items table */}
                {(proposal.upfront_items || []).length > 0 && (
                  <div style={{ border: '1px solid #DDE8EE', overflow: 'hidden' }}>
                    {(proposal.upfront_items || []).map((item, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 110px', alignItems: 'center', padding: '12px 20px', borderBottom: i < (proposal.upfront_items || []).length - 1 ? '1px solid #DDE8EE' : 'none', gap: 16, background: i % 2 === 0 ? 'white' : '#F9FAFB' }}>
                        <div>
                          {item.type && <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#009FE3', marginBottom: 2 }}>{item.type}</div>}
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#043D5D' }}>{item.name}</div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#043D5D', textAlign: 'right' as const }}>
                          £{Number(item.price).toLocaleString('en-GB')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background: '#043D5D', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.5)' }}>Total one-time investment</span>
                  <strong style={{ fontSize: 20, fontWeight: 900, color: '#009FE3', letterSpacing: '-.03em' }}>£{Number(proposal.upfront_total).toLocaleString('en-GB')} + VAT</strong>
                </div>
                {(proposal.upfront_notes || proposal.payment_terms) && (
                  <div style={{ padding: '10px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {proposal.upfront_notes && <p style={{ fontSize: 12, color: '#AAAAAA', margin: 0 }}>{proposal.upfront_notes}</p>}
                    {proposal.payment_terms && <p style={{ fontSize: 12, color: '#AAAAAA', fontStyle: 'italic', margin: 0 }}>Payment: {proposal.payment_terms}. Statement of work issued before any work begins.</p>}
                  </div>
                )}
              </div>

              {/* Standard ongoing options */}
              {standardOptions.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#043D5D', letterSpacing: '.04em', textTransform: 'uppercase' as const, paddingBottom: 8, borderBottom: '2px solid #043D5D', marginBottom: 2 }}>Part 2: Ongoing support (choose your level)</div>
                  <p style={{ color: '#3A6278', fontSize: 13, marginBottom: 18, marginTop: 16 }}>Choose the level of ongoing Shoothill support that suits your team. Select below:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${standardOptions.length}, 1fr)`, gap: 2, background: '#DDE8EE' }}>
                    {standardOptions.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => setSelectedStandard(i)}
                        style={{
                          background: selectedStandard === i ? '#F0FAFF' : 'white',
                          padding: '22px 18px',
                          cursor: 'pointer',
                          transition: 'background .2s',
                          border: selectedStandard === i ? '2px solid #009FE3' : r.recommended ? '2px solid #F59E0B' : '2px solid transparent',
                          position: 'relative' as const,
                          overflow: 'hidden' as const,
                        }}
                      >
                        {r.recommended && (
                          <div style={{ position: 'absolute' as const, top: 0, right: 0, background: '#F59E0B', color: 'white', fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase' as const, padding: '3px 10px' }}>
                            ★ Recommended
                          </div>
                        )}
                        <div style={{
                          width: 20, height: 20, border: selectedStandard === i ? 'none' : '2px solid #DDE8EE', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                          background: selectedStandard === i ? '#009FE3' : 'transparent',
                          color: selectedStandard === i ? 'white' : 'transparent',
                          marginBottom: 10, transition: 'all .2s',
                        }}>✓</div>
                        {r.type && <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#009FE3', marginBottom: 6 }}>{r.type}</div>}
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#043D5D', marginBottom: 2 }}>{r.name}</div>
                        {r.hours && <div style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 12 }}>{r.hours}</div>}
                        <div style={{ fontSize: 24, fontWeight: 900, color: '#043D5D', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 4 }}>
                          £{optionTotal(r).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: 13, fontWeight: 500, color: '#AAAAAA' }}>/ month</span>
                        </div>
                        {r.features.length > 0 && (
                          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12, paddingTop: 12, borderTop: '1px solid #DDE8EE', padding: 0 }}>
                            {r.features.map((f, j) => (
                              <li key={j} style={{ fontSize: 12, color: '#3A6278', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                                <span style={{ color: '#009FE3', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional extras */}
              {optionalExtras.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#043D5D', letterSpacing: '.04em', textTransform: 'uppercase' as const, paddingBottom: 8, borderBottom: '2px solid #043D5D', marginBottom: 2 }}>{standardOptions.length > 0 ? 'Part 3' : 'Part 2'}: Optional add-ons</div>
                  <p style={{ color: '#3A6278', fontSize: 13, marginBottom: 18, marginTop: 16 }}>Add any of the following to your package:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {optionalExtras.map((r, i) => {
                      const checked = checkedExtras.has(i);
                      return (
                        <div
                          key={i}
                          onClick={() => setCheckedExtras(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; })}
                          style={{
                            background: checked ? '#F0FAFF' : r.recommended ? '#FFFBEB' : 'white',
                            border: checked ? '2px solid #009FE3' : r.recommended ? '2px solid #F59E0B' : '2px solid #DDE8EE',
                            padding: '16px 20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            transition: 'all .2s',
                          }}
                        >
                          <div style={{
                            width: 20, height: 20, border: checked ? 'none' : '2px solid #DDE8EE', borderRadius: 4,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                            background: checked ? '#009FE3' : 'transparent',
                            color: 'white', flexShrink: 0, transition: 'all .2s',
                          }}>{checked ? '✓' : ''}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              {r.type && <div style={{ fontSize: 10, fontWeight: 700, color: '#009FE3', letterSpacing: '.1em', textTransform: 'uppercase' as const }}>{r.type}</div>}
                              {r.recommended && <div style={{ fontSize: 9, fontWeight: 800, color: '#92400E', background: '#FDE68A', padding: '1px 6px', letterSpacing: '.08em', textTransform: 'uppercase' as const }}>★ Recommended</div>}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#043D5D' }}>{r.name || r.type}</div>
                            {r.hours && <div style={{ fontSize: 12, color: '#AAAAAA' }}>{r.hours}</div>}
                            {r.features.length > 0 && (
                              <div style={{ fontSize: 12, color: '#3A6278', marginTop: 4 }}>{r.features.join(' · ')}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#043D5D' }}>£{optionTotal(r).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            <div style={{ fontSize: 11, color: '#AAAAAA' }}>/ month</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grand total */}
              <div style={{ background: '#043D5D', padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.45)', marginBottom: 6 }}>Investment summary</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
                    One-time project: <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>£{Number(proposal.upfront_total).toLocaleString('en-GB')}</span> + VAT
                    {monthlyTotal > 0 && <> &nbsp;·&nbsp; Monthly ongoing: <span style={{ color: 'rgba(255,255,255,.7)', fontWeight: 600 }}>£{monthlyTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> + VAT / month</>}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,.45)', marginBottom: 4, textAlign: 'right' }}>First year total</div>
                  <div style={{ fontSize: 34, fontWeight: 900, color: '#009FE3', letterSpacing: '-.04em', lineHeight: 1, textAlign: 'right', transition: 'all .3s' }}>£{firstYearTotal.toLocaleString('en-GB')}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', textAlign: 'right' }}>+ VAT · indicative first-year cost</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY BAND */}
      {(() => {
        const bandCols = 1 + (monthlyTotal > 0 ? 1 : 0) + (proposal.payment_terms ? 1 : 0) + 1;
        return (
          <div style={{ background: 'white', borderTop: '1px solid #DDE8EE', borderBottom: '1px solid #DDE8EE' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 48px', display: 'grid', gridTemplateColumns: `repeat(${bandCols}, 1fr)` }}>
              <div style={{ padding: '0 24px', borderRight: '1px solid #DDE8EE' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 6 }}>One-time project</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#009FE3', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 2 }}>£{Number(proposal.upfront_total).toLocaleString('en-GB')}</div>
                <div style={{ fontSize: 12, color: '#AAAAAA' }}>Excl. VAT</div>
              </div>
              {monthlyTotal > 0 && (
                <div style={{ padding: '0 24px', borderRight: '1px solid #DDE8EE' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 6 }}>Monthly ongoing</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#009FE3', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 2 }}>£{monthlyTotal.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 12, color: '#AAAAAA' }}>Excl. VAT / month</div>
                </div>
              )}
              {proposal.payment_terms && (
                <div style={{ padding: '0 24px', borderRight: '1px solid #DDE8EE' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 6 }}>Payment terms</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#043D5D', lineHeight: 1.4, marginTop: 4 }}>{proposal.payment_terms}</div>
                </div>
              )}
              <div style={{ padding: '0 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#AAAAAA', marginBottom: 6 }}>Proposal valid until</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#043D5D', marginTop: 6 }}>{formatDate(proposal.valid_until)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TEAM */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        <div id="team" style={{ background: 'white', border: '1px solid #DDE8EE', margin: '28px 0' }}>
          <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase' as const }}>03</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>Who You'll Work With</h2>
          </div>
          <div style={{ padding: '28px 32px' }}>
            <p style={{ color: '#3A6278', marginBottom: 22 }}>Our senior leadership team is personally involved in every engagement. Once your project begins, you'll be introduced to a dedicated Shoothill project manager who guides you through onboarding and delivery.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, background: '#DDE8EE' }}>
              {[
                { name: 'Simon Jeavons', role: 'Group Managing Director', bio: 'A Fellow of the Institute of Consulting with over 20 years of commercial operations expertise. Simon joined Shoothill in 2015 and was promoted to Group Managing Director in 2024, overseeing all aspects of the company and its subsidiary operations.', photo: 'https://shoothill.com/wp-content/uploads/2024/10/simon-bg.jpg' },
                { name: 'Josh Welch', role: 'Head of Commercial Operations', bio: 'Josh joined Shoothill as an apprentice in 2016 and has grown to lead the Commercial team. Working closely alongside Simon, he focuses on business development, project management and cross-functional coordination. Your primary point of contact from proposal through to delivery.', photo: 'https://shoothill.com/wp-content/uploads/2024/09/josh-bg.jpg' },
                { name: 'Mike Davis', role: 'Head of IT Services', bio: 'With over 20 years of IT services, procurement and project management experience across multiple industries, Mike has the breadth to integrate services effectively into any business environment and ensure smooth transitions with continued high-quality support.', photo: 'https://shoothill.com/wp-content/uploads/2024/09/mike-bg2.jpg' },
                { name: 'Claire Critchell', role: 'Head of Marketing Services', bio: 'Claire brings over 20 years of experience in marketing, communications and project management. From brand strategy and campaign planning to content and digital, she works closely with clients to deliver creative, practical solutions aligned with their business objectives.', photo: 'https://shoothill.com/wp-content/uploads/2024/09/claire-bg.jpg' },
              ].map(member => (
                <div key={member.name} style={{ background: 'white', overflow: 'hidden' }}>
                  <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', background: '#043D5D' }}>
                    <img style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} src={member.photo} alt={member.name} />
                  </div>
                  <div style={{ padding: '18px 18px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#043D5D', marginBottom: 1 }}>{member.name}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase' as const, color: '#009FE3', marginBottom: 8 }}>{member.role}</div>
                    <div style={{ fontSize: 12, color: '#3A6278', lineHeight: 1.6 }}>{member.bio}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NEXT STEPS */}
        <div style={{ background: 'white', border: '1px solid #DDE8EE', margin: '28px 0' }}>
          <div style={{ padding: '22px 32px 18px', borderBottom: '1px solid #DDE8EE', display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: '#009FE3', border: '1px solid #009FE3', padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase' as const }}>04</div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#043D5D', letterSpacing: '-.01em' }}>How We Get Started</h2>
          </div>
          <div style={{ padding: '28px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { n: 1, title: 'Choose your package', desc: 'Review the pricing above and click to choose your preferred package.' },
                { n: 2, title: 'Sign your service agreement', desc: 'Sign to accept your Shoothill service agreement. No work begins and no payment is due until you\'ve signed.' },
                { n: 3, title: 'Kick-off meeting', desc: `A 30-minute call with ${proposal.contact_name} to align on timelines, access requirements and next steps.` },
                { n: 4, title: 'Handover to project manager', desc: 'Once signed, you\'ll be introduced to your dedicated Shoothill project manager who will guide you through onboarding, set up your project workspace, and ensure a smooth transition into delivery.' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: 14, padding: '18px 20px', border: '1px solid #DDE8EE', alignItems: 'flex-start' }}>
                  <div style={{ width: 30, height: 30, background: '#009FE3', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{step.n}</div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#043D5D', marginBottom: 2 }}>{step.title}</h4>
                    <p style={{ fontSize: 12, color: '#AAAAAA', margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: '#043D5D', padding: '26px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginTop: 28 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 3 }}>Ready to move forward?</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', margin: 0 }}>Contact {proposal.contact_name} on {proposal.contact_phone} if you have any questions.</p>
              </div>
              <button
                onClick={() => navigate(`/p/${slug}/accept?standard=${selectedStandard}&extras=${[...checkedExtras].join(',')}`)}
                style={{ background: '#009FE3', color: 'white', fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const, padding: '13px 28px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                Accept your Shoothill service agreement →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section id="testimonials" style={{ background: '#F4F7FA', borderBottom: '1px solid #DDE8EE' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 48px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: '#009FE3', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 24, height: 2, background: '#009FE3', display: 'block' }} />What Our Clients Say
          </div>
          <h2 style={{ fontSize: 'clamp(18px, 2.4vw, 26px)', fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em' }}>Trusted by businesses across the UK</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, background: '#DDE8EE', marginTop: 28 }}>
            {[
              { quote: 'Blending design, software development and engineering — very few businesses would be able to tackle this challenge. Shoothill took it in their stride.', name: 'Edd Rayner', co: 'Operations Manager, FastAmps' },
              { quote: 'Shoothill provided the tools we needed to maximise our efficiency. They became a source of aid in helping us scale over the long term by consistently delivering digital solutions.', name: 'Nigel Kilby', co: 'Commercial Development Director, HD Sharman Ltd' },
              { quote: 'Working with Shoothill has been a great experience. The team are professional, supportive and the end product is just what we need. I highly recommend them.', name: 'Damian Winstone', co: 'Commercial Business Partner, ARH Group' },
              { quote: 'We switched to Shoothill after our relationship with an existing IT supplier broke down. The team guided us through with flexibility, competence and safety nets in place.', name: 'Ben Horrix', co: 'Head of IT, Specialist Lines' },
              { quote: 'When the opportunity arose to consolidate our IT services, we not only saved a considerable amount of money, but the level of service now far exceeds what we had before.', name: 'Russell Gwilliam', co: 'Matrix IDC' },
              { quote: 'What an experience working with Shoothill. Nothing but positive things to say — always going above and beyond. The perfect partner to trust with your development.', name: 'Sam Jones', co: 'Founder & CEO, Supporta' },
            ].map(t => (
              <div key={t.name} style={{ background: 'white', padding: '26px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: '#3A6278', lineHeight: 1.7, position: 'relative', paddingTop: 20 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: '#009FE3', opacity: .22, position: 'absolute', top: -10, left: -3, lineHeight: 1, fontFamily: 'Georgia, serif' }}>"</span>
                  {t.quote}
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#043D5D' }}>{t.name}</strong>
                  <span style={{ fontSize: 11, color: '#AAAAAA' }}>{t.co}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENT LOGOS */}
      <section id="clients" style={{ background: 'white', borderBottom: '1px solid #DDE8EE' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: 48 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: '#009FE3', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 24, height: 2, background: '#009FE3', display: 'block' }} />Clients We've Worked With
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#043D5D', letterSpacing: '-.02em', marginBottom: 28 }}>Trusted by global brands and growing businesses alike</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 2, background: '#DDE8EE' }}>
            {[
              { src: 'https://shoothill.com/wp-content/uploads/2024/09/microsoft.jpg', alt: 'Microsoft' },
              { src: 'https://shoothill.com/wp-content/uploads/2024/09/fujitsu.jpg', alt: 'Fujitsu' },
              { src: 'https://shoothill.com/wp-content/uploads/2024/09/disney.jpg', alt: 'Disney' },
              { src: 'https://shoothill.com/wp-content/uploads/2024/09/warnerBros.jpg', alt: 'Warner Bros' },
              { src: 'https://shoothill.com/wp-content/uploads/2024/09/environmentAgency.jpg', alt: 'Environment Agency' },
              { src: 'https://shoothill.com/wp-content/uploads/2024/09/bbcNews.jpg', alt: 'BBC' },
            ].map(logo => (
              <div key={logo.alt} style={{ background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 96 }}>
                <img style={{ width: '100%', height: 96, objectFit: 'cover', objectPosition: 'center', filter: 'grayscale(100%)', opacity: .75 }} src={logo.src} alt={logo.alt} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFFICES */}
      <section style={{ background: '#043D5D', padding: '52px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.18em', textTransform: 'uppercase' as const, color: 'rgba(0,159,227,.8)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 24, height: 2, background: 'rgba(0,159,227,.8)', display: 'block' }} />Our Locations
          </div>
          <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 800, color: 'white', letterSpacing: '-.025em', marginBottom: 8 }}>Delivering great results across the UK</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 32, maxWidth: 560 }}>Our expanding presence reflects our commitment to being close to our clients, so we can respond quickly and in person.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, background: 'rgba(255,255,255,.08)' }}>
            {[
              { badge: 'HQ', name: 'Shrewsbury', addr: 'Willow House East\nShrewsbury Business Park\nSY2 6LG', tel: '01743 636 300' },
              { badge: 'Midlands', name: 'Telford', addr: '3rd Floor, The Quad\nStation Quarter, Ironmasters Way\nTF3 4NT', tel: '01952 264 126' },
              { badge: 'North West', name: 'Chester', addr: '29 Grosvenor Street\nChester\nCH1 2DD', tel: '01244 628 874' },
              { badge: 'London', name: 'Stansted', addr: "Suite 53, Stansted Courtyard\nBishop's Stortford\nCM22 6PU", tel: '01371 868 486' },
            ].map(office => (
              <div key={office.name} style={{ background: 'rgba(255,255,255,.05)', padding: '24px 22px', border: '1px solid rgba(255,255,255,.1)' }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#009FE3', marginBottom: 8 }}>{office.badge}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 8 }}>{office.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.65, marginBottom: 10, whiteSpace: 'pre-line' }}>{office.addr}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(0,159,227,.8)' }}>{office.tel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: '#043D5D', padding: '64px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 56px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
            <img style={{ height: 28, marginBottom: 20, filter: 'brightness(0) invert(1)', width: 'fit-content' }} src="https://shoothill.com/wp-content/uploads/2024/07/Shoothill-site-logo-3.svg" alt="Shoothill" />
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', marginBottom: 36 }}>Award-winning, full-service digital technology experts</div>
            <h2 style={{ fontSize: 'clamp(26px, 3vw, 44px)', fontWeight: 800, color: 'white', letterSpacing: '-.03em', marginBottom: 22, lineHeight: 1.1 }}>Any questions then<br />get in touch!</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <a href={`mailto:${proposal.contact_email}`} style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>{proposal.contact_email}</a>
              <a href={`tel:${proposal.contact_phone.replace(/\s/g, '')}`} style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>{proposal.contact_phone}</a>
              {proposal.contact_mobile && <a href={`tel:${proposal.contact_mobile.replace(/\s/g, '')}`} style={{ fontSize: 15, color: 'rgba(255,255,255,.65)', textDecoration: 'none' }}>{proposal.contact_mobile}</a>}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 40 }}>
              <strong style={{ display: 'block', color: 'rgba(255,255,255,.35)', marginBottom: 3 }}>{formatDate(proposal.proposal_date)} &nbsp;·&nbsp; Classification: Customer</strong>
              Shoothill Ltd · Registered in England &amp; Wales · Confidential, prepared for {proposal.organisation}
            </div>
          </div>
          <ShootHillMark />
        </div>
      </section>
    </div>
  );
}
