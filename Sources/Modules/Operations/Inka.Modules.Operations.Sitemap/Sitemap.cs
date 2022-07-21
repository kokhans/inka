// MIT License
//
// Copyright (c) 2022 Serhii Kokhan
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

using System.Collections;
using System.Xml.Linq;
using System.Xml.Serialization;
using Carcass.Core;

namespace Inka.Modules.Operations.Sitemap;

[XmlRoot("urlset", Namespace = "http://www.sitemaps.org/schemas/sitemap/0.9")]
public sealed class Sitemap
{
    private readonly ArrayList _map;

    public Sitemap()
    {
        _map = new ArrayList();
    }

    [XmlElement("url")]
    public SitemapLocation[]? Locations
    {
        get
        {
            SitemapLocation[] locations = new SitemapLocation[_map.Count];
            _map.CopyTo(locations);

            return locations;
        }
        set
        {
            if (value is null)
                return;

            _map.Clear();
            foreach (SitemapLocation location in value)
                _map.Add(location);
        }
    }

    public int Add(SitemapLocation location)
    {
        ArgumentVerifier.NotNull(location, nameof(location));

        return _map.Add(location);
    }

    public override string ToString()
    {
        using StringWriter stringWriter = new();
        XmlSerializerNamespaces xmlSerializerNamespaces = new();
        xmlSerializerNamespaces.Add("image", "http://www.google.com/schemas/sitemap-image/1.1");
        XmlSerializer xmlSerializer = new(typeof(Sitemap));
        xmlSerializer.Serialize(stringWriter, this, xmlSerializerNamespaces);

        return XElement.Parse(stringWriter.GetStringBuilder().ToString()).ToString();
    }
}