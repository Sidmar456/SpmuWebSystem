import { useEffect, useState } from "react";

const slides = [
  {
    image: "/images/Gemini_Generated_Image_jzt3k5jzt3k5jzt3.jpg",
    title: "Welcome to SPMU",
    text: "Welcome to our system.",
  },
  {
    image: "/images/images%20(2).jpg",
    title: "Manage Your Inventory",
    text: "Easily manage your stocks and requests.",
  },
  {
    image: "/images/supply-chain-management-isolated-cartoon-vector-45971200.avif",
    title: "Simple and Efficient",
    text: "Everything you need in one system.",
  },
];

function Slideshow() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) =>
        prev === slides.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) =>
      prev === slides.length - 1 ? 0 : prev + 1
    );
  };

  const previousSlide = () => {
    setCurrentSlide((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );
  };

  return (
    <div className="slideshow" aria-label="SPMU highlights">
      <img
        src={slides[currentSlide].image}
        alt={slides[currentSlide].title}
        className="slide-image"
      />

      <div className="slide-content">
        <h1>{slides[currentSlide].title}</h1>
        <p>{slides[currentSlide].text}</p>
      </div>

      <button
        className="slide-prev"
        onClick={previousSlide}
        aria-label="Previous slide"
      >
        ❮
      </button>

      <button
        className="slide-next"
        onClick={nextSlide}
        aria-label="Next slide"
      >
        ❯
      </button>

      <div className="slide-dots">
        {slides.map((_, index) => (
          <button
            key={index}
            className={index === currentSlide ? "active" : ""}
            onClick={() => setCurrentSlide(index)}
            aria-label={`Go to slide ${index + 1}`}
            aria-current={index === currentSlide ? "true" : undefined}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>

    </div>
  );
}

export default Slideshow;