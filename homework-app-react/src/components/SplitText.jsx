import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function SplitText({
  text,
  className = '',
  delay = 0,
  duration = 0.5,
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  textAlign = 'left',
  onLetterAnimationComplete = () => {}
}) {
  const containerRef = useRef(null);

  const animate = () => {
    if (!containerRef.current) return;
    const chars = containerRef.current.querySelectorAll('.split-char');
    
    gsap.killTweensOf(chars);
    let animatedCount = 0;
    const totalChars = chars.length;

    gsap.fromTo(chars,
      from,
      {
        ...to,
        duration,
        stagger: 0.05,
        delay: delay / 1000,
        ease: "back.out(1.7)",
        onComplete: () => {
          animatedCount++;
          if (animatedCount === totalChars) {
            onLetterAnimationComplete();
          }
        }
      }
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animate();
        observer.disconnect();
      }
    }, { threshold });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    animate();
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ textAlign }}
      aria-label="Animated Text"
    >
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="split-char inline-block"
          style={{
            whiteSpace: char === ' ' ? 'pre' : 'normal',
            opacity: 0,
            willChange: 'transform, opacity'
          }}
        >
          {char}
        </span>
      ))}
    </div>
  );
}
