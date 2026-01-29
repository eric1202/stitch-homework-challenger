<script setup>
import { ref, onMounted, watch, nextTick } from 'vue';
import gsap from 'gsap';

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  className: {
    type: String,
    default: ''
  },
  delay: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number,
    default: 0.5
  },
  from: {
    type: Object,
    default: () => ({ opacity: 0, y: 40 })
  },
  to: {
    type: Object,
    default: () => ({ opacity: 1, y: 0 })
  },
  threshold: {
    type: Number,
    default: 0.1
  },
  textAlign: {
    type: String,
    default: 'left'
  },
  onLetterAnimationComplete: {
    type: Function,
    default: () => {}
  }
});

const container = ref(null);
const animatedCount = ref(0);

const animate = () => {
  if (!container.value) return;
  const chars = container.value.querySelectorAll('.split-char');
  
  // Reset
  gsap.killTweensOf(chars);
  const totalChars = chars.length;
  animatedCount.value = 0;

  gsap.fromTo(chars,
    props.from,
    {
      ...props.to,
      duration: props.duration,
      stagger: 0.05,
      delay: props.delay / 1000,
      ease: "back.out(1.7)",
      onComplete: () => {
        animatedCount.value++;
        if (animatedCount.value === totalChars) {
            props.onLetterAnimationComplete();
        }
      }
    }
  );
};

onMounted(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      animate();
      observer.disconnect();
    }
  }, { threshold: props.threshold });
  
  if (container.value) {
    observer.observe(container.value);
  }
});

watch(() => props.text, () => {
    nextTick(() => {
        animate();
    });
});
</script>

<template>
  <div 
    ref="container" 
    :class="className" 
    :style="{ textAlign: textAlign }"
    aria-label="Animated Text"
  >
    <span 
      v-for="(char, index) in text.split('')" 
      :key="index" 
      class="split-char inline-block" 
      :style="{ whiteSpace: char === ' ' ? 'pre' : 'normal', opacity: 0 }"
    >
      {{ char }}
    </span>
  </div>
</template>

<style scoped>
.split-char {
  will-change: transform, opacity;
}
</style>
