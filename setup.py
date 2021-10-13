#!/usr/bin/env python

"""The setup script."""

from setuptools import setup, find_packages

with open('README.md') as readme_file:
    readme = readme_file.read()

requirements = ['interpret', 'pulp']

test_requirements = ['pytest>=3', ]

setup(
    author="Jay Wang",
    author_email='jay@zijie.wang',
    python_requires='>=3.6',
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'Intended Audience :: Developers',
        'License :: OSI Approved :: MIT License',
        'Natural Language :: English',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
    ],
    description="Generating counterfactual explanations for GAMs",
    install_requires=requirements,
    license="MIT license",
    long_description=readme,
    include_package_data=True,
    keywords='gamcoach',
    name='gamcoach',
    packages=find_packages(include=['gamcoach', 'gamcoach.*']),
    url='https://github.com/xiaohk/gam-coach',
    version='0.1.1',
    zip_safe=False,
)
