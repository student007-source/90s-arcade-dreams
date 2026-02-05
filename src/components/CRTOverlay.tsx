const CRTOverlay = () => {
  return (
    <>
      {/* Scanlines */}
      <div 
        className="fixed inset-0 pointer-events-none z-[200]"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)',
        }}
      />
      
      {/* Vignette effect */}
      <div 
        className="fixed inset-0 pointer-events-none z-[201]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.4) 100%)',
        }}
      />
      
      {/* Subtle flicker */}
      <div 
        className="fixed inset-0 pointer-events-none z-[199] screen-flicker opacity-50"
        style={{
          background: 'linear-gradient(rgba(0,255,255,0.01) 50%, transparent 50%)',
          backgroundSize: '100% 4px',
        }}
      />
    </>
  );
};

export default CRTOverlay;
