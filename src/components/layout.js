import PropTypes from 'prop-types';
import { getLocaleFromPath } from '../i18n';
import Header from './header';
import Footer from './footer';

export default function Layout({ children, location, pageContext }) {
  const locale = getLocaleFromPath(location.pathname);
  const { pathname } = location;
  const { alternateLocalePath, onNotFoundPage } = pageContext;

  return (
    <>
      <Header
        locale={locale}
        path={pathname}
        alternateLocalePath={alternateLocalePath}
        onNotFoundPage={onNotFoundPage}
      />
      <main>{children}</main>
      <Footer
        locale={locale}
        path={pathname}
        alternateLocalePath={alternateLocalePath}
        onNotFoundPage={onNotFoundPage}
      />
    </>
  );
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  location: PropTypes.shape({ pathname: PropTypes.string.isRequired })
    .isRequired,
  pageContext: PropTypes.shape({
    alternateLocalePath: PropTypes.string,
    onNotFoundPage: PropTypes.bool,
  }).isRequired,
};
