function PersonalizePage({ page }) {
  return <div className="page-heading">
              <div>
                <p className="eyebrow">{page.eyebrow}</p>
                <h1>Personalize</h1>
                <p className="page-description">{page.description}</p>
              </div>
            </div>;
}

export default PersonalizePage;
