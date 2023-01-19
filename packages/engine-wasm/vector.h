#ifndef VECTOR_H
#define VECTOR_H

#include <cmath>
#include <vector>
#include <algorithm>

constexpr float PI = 3.14159265358979323846;
constexpr float SQRT2 = 1.4142135623730951;

class Vec;
class Vec2;
class Quat;
class Matrix;

class Matrix {
  public:
    float elements[16];

    Matrix() : elements() {}
    
    Matrix(const Matrix &m) {
      for (unsigned int i = 0; i < sizeof(this->elements) / sizeof(this->elements[0]); i++) {
        this->elements[i] = m.elements[i];
      }
    }

    Matrix(float *elements) {
      for (unsigned int i = 0; i < sizeof(this->elements) / sizeof(this->elements[0]); i++) {
        this->elements[i] = elements[i];
      }
    }

    Matrix(const Vec &position, const Quat &quaternion, const Vec &scale);

    Matrix &operator*=(const Matrix &m) {
      return this->multiply(*this, m);
    }

    Matrix operator*(const Matrix &m) const {
      return Matrix().multiply(*this, m);
    }

    Matrix &multiply(const Matrix &a, const Matrix &b) {
      const float * const ae = a.elements;
      const float * const be = b.elements;
      float *te = this->elements;

      const float a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
      const float a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
      const float a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
      const float a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];

      const float b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
      const float b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
      const float b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
      const float b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];

      te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
      te[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
      te[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
      te[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

      te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
      te[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
      te[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
      te[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

      te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
      te[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
      te[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
      te[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

      te[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
      te[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
      te[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
      te[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

      return *this;
    }
    Matrix &multiply(const Matrix &m) {
      return multiply(*this, m);
    }
    Matrix &premultiply(const Matrix &m) {
      return multiply(m, *this);
    }

    Matrix &compose(const Vec &position, const Quat &quaternion, const Vec &scale);
    Matrix &decompose(Vec &position, Quat &quaternion, Vec &scale);

    float determinant() const {
      const float *te = this->elements;

      const float n11 = te[ 0 ], n12 = te[ 4 ], n13 = te[ 8 ], n14 = te[ 12 ];
      const float n21 = te[ 1 ], n22 = te[ 5 ], n23 = te[ 9 ], n24 = te[ 13 ];
      const float n31 = te[ 2 ], n32 = te[ 6 ], n33 = te[ 10 ], n34 = te[ 14 ];
      const float n41 = te[ 3 ], n42 = te[ 7 ], n43 = te[ 11 ], n44 = te[ 15 ];

      //TODO: make this more efficient
      //( based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm )

      return (
        n41 * (
          + n14 * n23 * n32
           - n13 * n24 * n32
           - n14 * n22 * n33
           + n12 * n24 * n33
           + n13 * n22 * n34
           - n12 * n23 * n34
        ) +
        n42 * (
          + n11 * n23 * n34
           - n11 * n24 * n33
           + n14 * n21 * n33
           - n13 * n21 * n34
           + n13 * n24 * n31
           - n14 * n23 * n31
        ) +
        n43 * (
          + n11 * n24 * n32
           - n11 * n22 * n34
           - n14 * n21 * n32
           + n12 * n21 * n34
           + n14 * n22 * n31
           - n12 * n24 * n31
        ) +
        n44 * (
          - n13 * n22 * n31
           - n11 * n23 * n32
           + n11 * n22 * n33
           + n13 * n21 * n32
           - n12 * n21 * n33
           + n12 * n23 * n31
        )
      );
    }

    void lookAt(Vec eye, Vec target, Vec up);

    void setPosition(float x, float y, float z) {
      float *te = this->elements;
      
			te[ 12 ] = x;
			te[ 13 ] = y;
			te[ 14 ] = z;
    }

    void setPosition(Vec position);

    void identity() {
      float *te = this->elements;

      te[ 0 ] = 1; te[ 4 ] = 0; te[ 8 ] = 0; te[ 12 ] = 0;
      te[ 1 ] = 0; te[ 5 ] = 1; te[ 9 ] = 0; te[ 13 ] = 0;
      te[ 2 ] = 0; te[ 6 ] = 0; te[ 10 ] = 1; te[ 14 ] = 0;
      te[ 3 ] = 0; te[ 7 ] = 0; te[ 11 ] = 0; te[ 15 ] = 1;
    }

    static Matrix fromArray(float *elements) {
      return Matrix(elements);
    }
};

// 3D Vector Class
// Can also be used for 2D vectors
// by ignoring the z value
class Vec {
  public:
    
        union {
            float data[3];
            struct {
                float x;
                float y;
                float z;
            };
        };

        // Constructors

        // Vectors default to 0, 0, 0.
        Vec() {
            x = 0;
            y = 0;
            z = 0;
        }

        // Construct with values, 3D
        Vec(float ax, float ay, float az) {
            x = ax;
            y = ay;
            z = az;
        }

        /* // Construct with values, 2D
        Vec(float ax, float ay) {
            x = ax;
            y = ay;
            z = 0;
        } */

        // Copy constructor
        Vec(const Vec &o) {
            x = o.x;
            y = o.y;
            z = o.z;
        }

        Vec& operator=(const Vec &v) {
            x = v.x;
            y = v.y;
            z = v.z;
            return *this;
        }

        // Addition
        
        Vec operator+(const Vec &o) const {
            return Vec(x + o.x, y + o.y, z + o.z);
        }

        Vec& operator+=(const Vec &o) {
            x += o.x;
            y += o.y;
            z += o.z;
            return *this;
        }

        // Subtraction

        Vec operator-() const {
            return Vec(-x, -y, -z);
        }

        Vec operator-(const Vec &o) const {
            return Vec(x - o.x, y - o.y, z - o.z);
        }

        Vec& operator-=(const Vec &o) {
            x -= o.x;
            y -= o.y;
            z -= o.z;
            return *this;
        }

        // Multiplication by scalars

        Vec operator*(const float s) const {
            return Vec(x * s, y * s, z * s);
        }

        Vec& operator*=(const float s) {
            x *= s;
            y *= s;
            z *= s;
            return *this;
        }

        // Division by scalars

        Vec operator/(const float s) const {
            return Vec(x / s, y / s, z / s);
        }

        Vec& operator/=(const float s) {
            x /= s;
            y /= s;
            z /= s;
            return *this;
        }
        
        // Dot product

        Vec operator*(const Vec &o) const {
            return Vec(x * o.x, y * o.y, z * o.z);
        }
        Vec &operator*=(const Vec &o) {
          x *= o.x;
          y *= o.y;
          z *= o.z;
          return *this;
        }

        // An in-place dot product does not exist because
        // the result is not a vector.

        // Cross product

        Vec operator^(const Vec &o) const {
            float nx = y * o.z - o.y * z;
            float ny = z * o.x - o.z * x;
            float nz = x * o.y - o.x * y;
            return Vec(nx, ny, nz);
        }

        Vec& operator^=(const Vec &o) {
            float nx = y * o.z - o.y * z;
            float ny = z * o.x - o.z * x;
            float nz = x * o.y - o.x * y;
            x = nx;
            y = ny;
            z = nz;
            return *this;
        }

        // Other functions
        
        // Length of vector
        float magnitude() const {
            return sqrt(magnitude_sqr());
        }

        // Length of vector squared
        float magnitude_sqr() const {
            return (x * x) + (y * y) + (z * z);
        }

        // Returns a normalized copy of the vector
        // Will break if it's length is 0
        Vec normalized() const {
            return Vec(*this) / magnitude();
        }

        // Modified the vector so it becomes normalized
        Vec& normalize() {
            (*this) /= magnitude();
            return *this;
        }

        Vec& min(const Vec &o) {
          x = std::min<float>(x, o.x);
          y = std::min<float>(y, o.y);
          z = std::min<float>(z, o.z);
          return *this;
        }

        Vec& max(const Vec &o) {
          x = std::max<float>(x, o.x);
          y = std::max<float>(y, o.y);
          z = std::max<float>(z, o.z);
          return *this;
        }

        float distanceTo(const Vec &v) const {
          return (*this - v).magnitude();
        }

        float distanceToSq(const Vec &v) const {
          return (*this - v).magnitude_sqr();
        }

        float dot(const Vec &v) const {
          return this->x * v.x + this->y * v.y + this->z * v.z;
        }

        Vec &applyQuaternion(const Quat &q);

        Vec &applyMatrix(const Matrix &m) {
          const float x = this->x, y = this->y, z = this->z;
          const float *e = m.elements;

          const float w = 1.0f / ( e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] );

          this->x = ( e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] ) * w;
          this->y = ( e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] ) * w;
          this->z = ( e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] ) * w;

          return *this;
        }

        Vec clone() const {
          return Vec(x, y, z);
        }
};
class Vec2 {
  public:
    
        union {
            float data[2];
            struct {
                float x;
                float y;
            };
        };
};
class Quat {
  public:
    union {
      float data[4];
      struct {
        float x;
        float y;
        float z;
        float w;
      };
    };

    Quat() {
      x = 0;
      y = 0;
      z = 0;
      w = 1;
    }

    Quat(float ax, float ay, float az, float aw) {
      x = ax;
      y = ay;
      z = az;
      w = aw;
    }

    Quat(const Quat &q) {
      x = q.x;
      y = q.y;
      z = q.z;
      w = q.w;
    }

    Quat(const Vec &axis, float angle) {
      const float halfAngle = angle / 2.0f, s = std::sin(halfAngle);

      x = axis.x * s;
      y = axis.y * s;
      z = axis.z * s;
      w = std::cos(halfAngle);
    }
    Quat &operator=(const Quat &q) {
      x = q.x;
      y = q.y;
      z = q.z;
      w = q.w;
      return *this;
    }

    float length() const {
      return std::sqrt( this->x * this->x + this->y * this->y + this->z * this->z + this->w * this->w );
    }

    Quat &normalize() {
      float l = this->length();

      if ( l == 0.0f ) {

        this->x = 0.0f;
        this->y = 0.0f;
        this->z = 0.0f;
        this->w = 1.0f;

      } else {

        l = 1.0f / l;

        this->x = this->x * l;
        this->y = this->y * l;
        this->z = this->z * l;
        this->w = this->w * l;

      }

      return *this;
    }

    Quat &setFromRotationMatrix(const Matrix &m) {
      // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

      // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

      const float *te = m.elements;
      const float m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
        m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
        m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ],
        trace = m11 + m22 + m33;

      if ( trace > 0.0f ) {

        const float s = 0.5f / std::sqrt( trace + 1.0f );

        w = 0.25f / s;
        x = ( m32 - m23 ) * s;
        y = ( m13 - m31 ) * s;
        z = ( m21 - m12 ) * s;

      } else if ( m11 > m22 && m11 > m33 ) {

        const float s = 2.0f * std::sqrt( 1.0f + m11 - m22 - m33 );

        w = ( m32 - m23 ) / s;
        x = 0.25f * s;
        y = ( m12 + m21 ) / s;
        z = ( m13 + m31 ) / s;

      } else if ( m22 > m33 ) {

        const float s = 2.0f * std::sqrt( 1.0f + m22 - m11 - m33 );

        w = ( m13 - m31 ) / s;
        x = ( m12 + m21 ) / s;
        y = 0.25f * s;
        z = ( m23 + m32 ) / s;

      } else {

        const float s = 2.0f * std::sqrt( 1.0f + m33 - m11 - m22 );

        w = ( m21 - m12 ) / s;
        x = ( m13 + m31 ) / s;
        y = ( m23 + m32 ) / s;
        z = 0.25f * s;
      }

      return *this;
    }

    Quat &setFromUnitVectors( const Vec &vFrom, const Vec &vTo ) {

      // assumes direction vectors vFrom and vTo are normalized

      const float EPS = 0.000001f;

      float r = vFrom.dot( vTo ) + 1.0f;

      if ( r < EPS ) {

        r = 0.0f;

        if ( std::abs( vFrom.x ) > std::abs( vFrom.z ) ) {

          this->x = - vFrom.y;
          this->y = vFrom.x;
          this->z = 0.0f;
          this->w = r;

        } else {

          this->x = 0.0f;
          this->y = - vFrom.z;
          this->z = vFrom.y;
          this->w = r;

        }

      } else {

        // crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3

        this->x = vFrom.y * vTo.z - vFrom.z * vTo.y;
        this->y = vFrom.z * vTo.x - vFrom.x * vTo.z;
        this->z = vFrom.x * vTo.y - vFrom.y * vTo.x;
        this->w = r;

      }

      return this->normalize();

    }

    Quat &multiply(const Quat &a, const Quat &b) {
      const float qax = a.x, qay = a.y, qaz = a.z, qaw = a.w;
      const float qbx = b.x, qby = b.y, qbz = b.z, qbw = b.w;

      x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
      y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
      z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
      w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

      return *this;
    }
    Quat &multiply(const Quat &q) {
      return multiply(*this, q);
    }
    Quat &premultiply(const Quat &q) {
      return multiply(q, *this);
    }
};

class Tri {
  public:
    Vec a;
    Vec b;
    Vec c;

    Tri() {
    }

    Tri(const Vec &a, const Vec &b, const Vec &c) : a(a), b(b), c(c) {
    }

    Tri(const Tri &t) : a(t.a), b(t.b), c(t.c) {
    }

    Vec normal() const {
      Vec result(c);
      result -= b;
      Vec v0(a);
      v0 -= b;
      result ^= v0;

      float resultLengthSq = result.magnitude_sqr();
      if (resultLengthSq > 0) {
        result *= 1.0 / sqrt(resultLengthSq);
        return result;
      }
      return Vec(0, 0, 0);
    }

    Vec midpoint() const {
      Vec result(a);
      result += b;
      result += c;
      result *= 1.0/3.0;
      return result;
    }

    Vec baryCoord(const Vec &point) const {
      const Vec v0 = c - a;
      const Vec v1 = b - a;
      const Vec v2 = point - a;

      const float dot00 = v0.dot(v0);
      const float dot01 = v0.dot(v1);
      const float dot02 = v0.dot(v2);
      const float dot11 = v1.dot(v1);
      const float dot12 = v1.dot(v2);

      const float denom = dot00 * dot11 - dot01 * dot01;

      // collinear or singular triangle
      if (denom == 0.0) {
        // arbitrary location outside of triangle?
        // not sure if this is the best idea, maybe should be returning undefined
        return Vec(-1.0, -1.0, -1.0 );
      }

      const float invDenom = 1.0 / denom;
      const float u = (dot11 * dot02 - dot01 * dot12) * invDenom;
      const float v = (dot00 * dot12 - dot01 * dot02) * invDenom;

      // barycentric coordinates must always sum to 1
      return Vec(1.0 - u - v, v, u);
    }
};

class Sphere {
  public:
    Sphere() : center(), radius(0) {}

    Vec center;
    float radius;

    Sphere(const Vec &center, float radius) : center(center), radius(radius) {}
    Sphere(float x, float y, float z, float radius) : center(x, y, z), radius(radius) {}
    Sphere(const Sphere &sphere) : center(sphere.center), radius(sphere.radius) {}
};

class Ray {
  public:
    Vec origin;
    Vec direction;

    Ray() {}

    Ray(const Vec &origin, const Vec &direction) : origin(origin), direction(direction) {}

    Vec at(float t) const {
      return (this->direction * t) + this->origin;
    }

    float distanceSqToPoint(const Vec &point) const {
      const float directionDistance = (point - this->origin).dot(this->direction);

      // point behind the ray
      if (directionDistance < 0) {
        return this->origin.distanceToSq(point);
      }

      const Vec v = (this->direction * directionDistance) + this->origin;
      return v.distanceToSq(point);
    }

    bool intersectTriangle(const Tri &tri, Vec &result) const {
      Vec edge1 = tri.b - tri.a;
      Vec edge2 = tri.c - tri.a;
      Vec normal = edge1 ^ edge2;

      // Solve Q + t*D = b1*E1 + b2*E2 (Q = kDiff, D = ray direction,
      // E1 = kEdge1, E2 = kEdge2, N = Cross(E1,E2)) by
      //   |Dot(D,N)|*b1 = sign(Dot(D,N))*Dot(D,Cross(Q,E2))
      //   |Dot(D,N)|*b2 = sign(Dot(D,N))*Dot(D,Cross(E1,Q))
      //   |Dot(D,N)|*t = -sign(Dot(D,N))*Dot(Q,N)
      float DdN = this->direction.dot(normal);
      float sign;

      if (DdN > 0) {
        return false;
        // if ( backfaceCulling ) return false;
        // sign = 1;
      } else if ( DdN < 0 ) {
        sign = -1;
        DdN = -DdN;
      } else {
        return false;
      }

      Vec diff = this->origin - tri.a;
      float DdQxE2 = sign * (this->direction.dot(diff ^ edge2));

      // b1 < 0, no intersection
      if (DdQxE2 < 0) {
        return false;
      }

      float DdE1xQ = sign * (this->direction.dot(edge1 ^ diff));

      // b2 < 0, no intersection
      if ( DdE1xQ < 0 ) {
        return false;
      }

      // b1+b2 > 1, no intersection
      if (DdQxE2 + DdE1xQ > DdN) {
        return false;
      }

      // Line intersects triangle, check if ray does.
      float QdN = -sign * (diff.dot(normal));

      // t < 0, no intersection
      if (QdN < 0) {
        return false;
      }

      // Ray intersects triangle.
      result = this->at(QdN / DdN);
      return true;
    }

    bool intersectsSphere(const Sphere &sphere) const {
      return this->distanceSqToPoint(sphere.center) <= (sphere.radius * sphere.radius);
    }
};

class Line {
public:
  Vec start;
  Vec end;
  Line() {}
  Line(const Vec &start, const Vec &end) : start(start), end(end) {}

  Vec delta() const {
    return this->end - this->start;
  }

  float closestPointToPointParameter( const Vec &point, bool clampToLine ) const {

    const Vec _startP = point - this->start;
    const Vec _startEnd = this->end - this->start;

    const float startEnd2 = _startEnd.dot( _startEnd );
    const float startEnd_startP = _startEnd.dot( _startP );

    float t = startEnd_startP / startEnd2;

    if ( clampToLine ) {

      t = std::min(std::max(t, 0.0f), 1.0f);

    }

    return t;

  }

  Vec closestPointToPoint( const Vec &point, bool clampToLine ) const {
    const float t = this->closestPointToPointParameter( point, clampToLine );
    return (this->delta() * t) + this->start;
  }

  float distanceTo(const Vec &p) const {
    Vec linePoint = this->closestPointToPoint(p, true);
    return (p - linePoint).magnitude();
  }
};

class Plane {
  public:
    Vec normal;
    float constant;

    Plane() {}

    Plane(const Vec &normal, float constant) : normal(normal), constant(constant) {}

    Plane &setComponents(float x, float y, float z, float w) {
		  normal = Vec(x, y, z);
      constant = w;
      return *this;
    }

    Plane &setFromNormalAndCoplanarPoint(const Vec &normal, const Vec& point) {
      this->normal = normal;
      this->constant = -(point.dot(normal));

      return *this;
    }

    Plane &setFromPoints(const Vec *points, unsigned int numPoints, Vec &mean) {
      for (unsigned int i = 0; i < numPoints; i++) {
        mean += points[i];
      }
      mean /= (float)numPoints;

      float largestMeanDistance = -std::numeric_limits<float>::infinity();
      int largestMeanDistanceIndex = -1;
      for (unsigned int i = 0; i < numPoints; i++) {
        float distance = (points[i] - mean).magnitude();
        if (distance > largestMeanDistance) {
          largestMeanDistance = distance;
          largestMeanDistanceIndex = i;
        }
      }

      const Vec &startPoint = points[largestMeanDistanceIndex];
      float maxEndPointDistance = -std::numeric_limits<float>::infinity();
      int maxEndPointDistanceIndex = -1;
      for (unsigned int i = 0; i < numPoints; i++) {
        float distance = (points[i] - startPoint).magnitude();
        if (distance > maxEndPointDistance) {
          maxEndPointDistance = distance;
          maxEndPointDistanceIndex = i;
        }
      }
      const Vec &endPoint = points[maxEndPointDistanceIndex];

      const Line line(startPoint, endPoint);
      float maxAuxPointDistance = -std::numeric_limits<float>::infinity();
      int maxAuxPointDistanceIndex = -1;
      for (unsigned int i = 0; i < numPoints; i++) {
        float distance = line.distanceTo(points[i]);
        if (distance > maxAuxPointDistance) {
          maxAuxPointDistance = distance;
          maxAuxPointDistanceIndex = i;
        }
      }
      const Vec &auxPoint = points[maxAuxPointDistanceIndex];
      Tri tri(startPoint, endPoint, auxPoint);
      Vec normal = tri.normal();
      Vec midpoint = tri.midpoint();
      return this->setFromNormalAndCoplanarPoint(normal, midpoint);
    }
    Plane &setFromPoints(const Vec *points, unsigned int numPoints) {
      Vec mean;
      return this->setFromPoints(points, numPoints, mean);
    }

    Plane &normalize() {
      float inverseNormalLength = 1.0 / normal.magnitude();
      normal *= inverseNormalLength;
      constant *= inverseNormalLength;

      return *this;
    }

    float distanceToPoint(const Vec &point) const {
      return normal.dot(point) + constant;
    }

    Vec projectPoint(const Vec &point) {
      return (this->normal * (-distanceToPoint(point))) + point;
    }

    /* bool intersectLine(const Line &line, Vec &result) const {
      Vec direction = line.delta();

      float denominator = this->normal * direction;
      if (denominator == 0.0) {
        // line is coplanar, return origin
        if (this->distanceToPoint(line.start) == 0.0) {
          result = line.start;
          return true;
        }

        // Unsure if this is the correct method to handle this case.
        return false;
      }

      float t = -((line.start * this->normal) + this->constant) / denominator;
      if (t < 0.0 || t > 1.0) {
        return false;
      }

      result = (direction * t) + line.start;
      return true;
    }

    Vec projectPoint(const Vec &p) const {
      return (this->normal * -this->distanceToPoint(p)) + p;
    } */
};

/* class Box {
  public:
    Vec position;
    Quat rotation;
    Vec size;
    Vec points[4 * 3];

    Box(const Vec &position, const Quat &rotation, const Vec &size) : position(position), rotation(rotation), size(size) {
      unsigned int index = 0;
      for (int dy = 0; dy <= 2; dy++) {
        for (int dz = -1; dz <= 1; dz++) {
          if (dz == 0) continue;
          for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0) continue;

            Vec point(this->position);
            point += Vec((this->size.x / 2.0) * dx, -1.6 + (this->size.y / 2.0) * dy, (this->size.z / 2.0) * dz);//.applyQuaternion(this->rotation);
            points[index++] = point;
          }
        }
      }
    }

    Box &operator+=(const Vec &v) {
      position += v;

      for (unsigned int i = 0; i < (4 * 3); i++) {
        points[i] += v;
      }

      return *this;
    }
}; */

class Box {
public:
  /* Box() {
    
  } */
  void setFromPositions(float *positions, unsigned int numPositions) {
    min.x = std::numeric_limits<float>::infinity();
    min.y = std::numeric_limits<float>::infinity();
    min.z = std::numeric_limits<float>::infinity();

    max.x = -std::numeric_limits<float>::infinity();
    max.y = -std::numeric_limits<float>::infinity();
    max.z = -std::numeric_limits<float>::infinity();

    for (int i = 0; i < numPositions; i += 3) {
      float x = positions[i];
      float y = positions[i+1];
      float z = positions[i+2];

      if ( x < min.x ) min.x = x;
      if ( y < min.y ) min.y = y;
      if ( z < min.z ) min.z = z;

      if ( x > max.x ) max.x = x;
      if ( y > max.y ) max.y = y;
      if ( z > max.z ) max.z = z;
    }
  }
  Vec center() const {
    return Vec{
      (min.x+max.x)/2.0f,
      (min.y+max.y)/2.0f,
      (min.z+max.z)/2.0f,
    };
  }
  Vec size() const {
    return Vec{
      max.x-min.x,
      max.y-min.y,
      max.z-min.z,
    };
  }

  Vec min;
  Vec max;
};

class Frustum {
  public:
    Plane planes[6];

    Frustum() {}

    bool intersectsSphere(const Sphere &sphere) const {
      const Vec &center = sphere.center;
      const float negRadius = - sphere.radius;

      for ( unsigned int i = 0; i < 6; i ++ ) {

        const float distance = planes[ i ].distanceToPoint( center );

        if ( distance < negRadius ) {

          return false;

        }

      }

      return true;
    }

    Frustum &setFromMatrix(const Matrix &m) {
      const float * const me = m.elements;
      const float me0 = me[ 0 ], me1 = me[ 1 ], me2 = me[ 2 ], me3 = me[ 3 ];
      const float me4 = me[ 4 ], me5 = me[ 5 ], me6 = me[ 6 ], me7 = me[ 7 ];
      const float me8 = me[ 8 ], me9 = me[ 9 ], me10 = me[ 10 ], me11 = me[ 11 ];
      const float me12 = me[ 12 ], me13 = me[ 13 ], me14 = me[ 14 ], me15 = me[ 15 ];

      planes[ 0 ].setComponents( me3 - me0, me7 - me4, me11 - me8, me15 - me12 ).normalize();
      planes[ 1 ].setComponents( me3 + me0, me7 + me4, me11 + me8, me15 + me12 ).normalize();
      planes[ 2 ].setComponents( me3 + me1, me7 + me5, me11 + me9, me15 + me13 ).normalize();
      planes[ 3 ].setComponents( me3 - me1, me7 - me5, me11 - me9, me15 - me13 ).normalize();
      planes[ 4 ].setComponents( me3 - me2, me7 - me6, me11 - me10, me15 - me14 ).normalize();
      planes[ 5 ].setComponents( me3 + me2, me7 + me6, me11 + me10, me15 + me14 ).normalize();

      return *this;
    }

    static Frustum fromMatrix(const Matrix &m) {
      return Frustum().setFromMatrix(m);
    }
};

#endif
