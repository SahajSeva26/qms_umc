// features/rating's public surface for other features — narrow by design: CampRatingSection is
// the only thing another feature (features/camps) actually needs; its own RateCampModal/
// RatingDisplay/useRatings/useRateCamp stay internal, consumed only by CampRatingSection itself.
//
// Safe to export CampRatingSection eagerly here (unlike features/camps's heavier lazy components)
// because every real consumer (PharmaCampDetailDrawer, CampDossierContent) already renders it as a
// plain synchronous import — it has no React.lazy boundary of its own to protect; the actual heavy
// split (RateCampModal) is already lazy-loaded INSIDE CampRatingSection, not at this barrel's level.
export { default as CampRatingSection } from './components/CampRatingSection'
